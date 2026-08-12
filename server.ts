// PRIMEIRA linha de propósito: carrega o arquivo .env antes de qualquer outro
// módulo. A verificação de JWT_SECRET mais abaixo roda no carregamento deste
// arquivo, então se o .env vier depois ela leria variáveis vazias.
//
// O pacote dotenv estava instalado mas nunca era importado — na prática o .env
// era ignorado por completo e todas as variáveis precisavam vir do ambiente.
import "dotenv/config";

import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import dns from "dns";
import net from "net";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as storage from "./src/lib/storage";
import { seedVerses } from "./src/lib/seedVerses";
import { fetchVerseText } from "./src/lib/bible";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia, Poll } = pkg;
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import cron from 'node-cron';
import AdmZip from 'adm-zip';
import multer from 'multer';
import webpush from 'web-push';

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // A extensão vem do tipo declarado, não do nome enviado pelo cliente.
    // Aceitar `originalname` permitia salvar .html ou .svg na pasta /uploads,
    // que é servida como estática — ou seja, XSS hospedado no próprio domínio.
    const ext = UPLOAD_EXTENSION_BY_MIME[file.mimetype] || '.bin';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

/**
 * Tipos aceitos em upload, com a extensão correspondente.
 *
 * Importante: SVG fica de fora de propósito. Um SVG pode conter <script>, e
 * como a pasta /uploads é servida diretamente, isso viraria XSS no domínio.
 */
const UPLOAD_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'video/mp4': '.mp4',
  // Necessários para a importação de backup
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/octet-stream': '.bin',
};

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB, para imagens de alta resolução e backups
  fileFilter: (req, file, cb) => {
    if (UPLOAD_EXTENSION_BY_MIME[file.mimetype]) {
      return cb(null, true);
    }
    console.warn(`[Upload] Tipo recusado: ${file.mimetype} (${file.originalname})`);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
});

/**
 * Chave de assinatura dos tokens de login.
 *
 * Com um valor padrão previsível, qualquer pessoa consegue forjar um token de
 * superadmin e assumir o sistema. Por isso, em produção, o servidor se recusa
 * a subir sem uma chave própria e suficientemente longa.
 *
 * Para gerar uma: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
 */
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (secret && secret.length >= 32 && secret !== "your-secret-key") {
    return secret;
  }

  if (isProduction) {
    console.error(
      "\n[FATAL] JWT_SECRET ausente, curta (mínimo 32 caracteres) ou usando o valor de exemplo.\n" +
      "        Defina JWT_SECRET no .env antes de subir em produção.\n" +
      "        Gere uma com: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"\n"
    );
    process.exit(1);
  }

  console.warn(
    "\n" + "!".repeat(70) + "\n" +
    "[AVISO GRAVE] O servidor está em MODO DESENVOLVIMENTO (NODE_ENV != production).\n" +
    "\n" +
    "  Nesse modo:\n" +
    "   - os tokens de login usam uma chave PÚBLICA e previsível;\n" +
    "   - o servidor de desenvolvimento do Vite fica exposto junto com a API.\n" +
    "\n" +
    "  Se este servidor está acessível pela internet, defina NODE_ENV=production\n" +
    "  e JWT_SECRET agora. Use `npm start`, que já define NODE_ENV.\n" +
    "!".repeat(70) + "\n"
  );
  return "desenvolvimento-local-apenas-nao-use-em-producao";
})();

// --- WhatsApp Global State ---
let whatsappClient: any | null = null;
let lastQr: string | null = null;
let whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'AUTHENTRICATING' = 'DISCONNECTED';
let whatsappError: string | null = null;

const START_TIME = Date.now();

// --- Web Push Setup ---
let vapidKeys: { publicKey: string, privateKey: string } | null = null;

async function initWebPush() {
    try {
        const configs = await storage.readCollection<any>("config");
        let vapidConfig = configs.find((c: any) => c.id === "vapid");
        
        if (!vapidConfig) {
            const keys = webpush.generateVAPIDKeys();
            vapidConfig = { id: 'vapid', ...keys };
            await storage.insert("config", vapidConfig);
            console.log("VAPID keys generated and stored.");
        }
        
        vapidKeys = { publicKey: vapidConfig.publicKey, privateKey: vapidConfig.privateKey };
        webpush.setVapidDetails(
            'mailto:gustavoacacio0711@gmail.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
    } catch (e) {
        console.error("Error initializing Web Push:", e);
    }
}
initWebPush();

async function sendPushNotification(title: string, body: string, url: string = '/', targetUserIds?: string[]) {
    try {
        let subscriptions = await storage.readCollection<any>("push_subscriptions");
        
        if (targetUserIds) {
            const allowedUsers = new Set(targetUserIds);
            subscriptions = subscriptions.filter((s:any) => allowedUsers.has(s.userId));
        }
        
        console.log(`Sending push to ${subscriptions.length} subscribers: ${title}`);
        
        const payload = JSON.stringify({ title, body, url });
        
        const promises = subscriptions.map(sub => 
            webpush.sendNotification(sub, payload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log('Push subscription expired/unsubscribed:', sub.endpoint);
                    return storage.remove("push_subscriptions", sub.id);
                }
                console.error('Error sending push:', err);
            })
        );
        
        await Promise.all(promises);
    } catch (e) {
        console.error("Failed to send push notifications:", e);
    }
}

async function getWhatsAppChatId(phone: string) {
    if (!whatsappClient) return null;
    
    let clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) {
        clean = '55' + clean;
    }
    
    try {
        // Try exactly as provided
        let numberId = await whatsappClient.getNumberId(clean);
        
        if (!numberId && clean.length === 12) {
            // Usually 12 digits means 55 + 2 (DDD) + 8 digits (missing the 9)
            const with9 = clean.substring(0, 4) + '9' + clean.substring(4);
            numberId = await whatsappClient.getNumberId(with9);
        } else if (!numberId && clean.length === 13) {
            // Usually 13 digits means 55 + 2 (DDD) + 9 digits (has the 9)
            // Some regions don't use the 9 in Whatsapp even if it is a mobile phone
            const without9 = clean.substring(0, 4) + clean.substring(5);
            numberId = await whatsappClient.getNumberId(without9);
        }
        
        return numberId ? numberId._serialized : `${clean}@c.us`;
    } catch (e) {
        console.error("Error getting number id", e);
        return `${clean}@c.us`; // Fallback
    }
}

async function getTodayBirthdaysMessage(): Promise<string> {
    try {
        const users = await storage.readCollection<any>("users");
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const todayBirthdays = users.filter(u => {
            if (!u.birthDate) return false;
            const parts = u.birthDate.split('-');
            if (parts.length !== 3) return false;
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            return month === currentMonth && day === currentDay;
        });

        if (todayBirthdays.length === 0) return "";

        let msg = "🎂 *Aniversariantes de Hoje:*\n\n";
        todayBirthdays.forEach(u => {
            const parts = u.birthDate.split('-');
            const birthYear = parseInt(parts[0], 10);
            const age = today.getFullYear() - birthYear;
            msg += `• *${u.name}*\n  📱 Contato: ${u.phone || 'Desconhecido'}\n  🎈 Completando: ${age} anos\n\n`;
        });
        return msg;
    } catch (e) {
        console.error("Error getting birthdays for notification", e);
        return "";
    }
}

async function sendWhatsAppNotifications(message: string) {
    try {
        if (!whatsappClient || whatsappStatus !== 'READY') {
            console.log('WhatsApp notification skipped: Client not ready');
            return;
        }

        const configs = await storage.readCollection<any>("config");
        const whatsappConfig = configs.find((c: any) => c.id === "whatsapp");                
        
        const phones = whatsappConfig?.adminPhones || [];
        if (!phones || phones.length === 0) {
             throw new Error('Nenhum telefone de administrador configurado.');
        }

        if (Array.isArray(phones)) {
            for (const phone of phones) {
                 const chatId = await getWhatsAppChatId(phone);
                 if (!chatId) continue;
                 console.log(`Enviando mensagem WhatsApp para: ${chatId}`);
                 await whatsappClient.sendMessage(chatId, message);
            }
        }
    } catch (err) {
        console.error('Failed to notify admins via WhatsApp:', err);
        throw err;
    }
}

async function initWhatsApp() {
  if (whatsappClient) return;

  console.log('Initializing WhatsApp Client...');
  whatsappStatus = 'INITIALIZING';
  whatsappError = null;

  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  const sessionName = 'session';
  const sessionPath = path.join(authPath, `session-${sessionName}`);
  
  // Limpeza de arquivos de trava do Puppeteer que impedem reinicialização
  try {
    const lockFiles = [
      path.join(sessionPath, 'SingletonLock'),
      path.join(sessionPath, 'SingletonCookie'),
      path.join(sessionPath, 'SingletonSocket'),
      path.join(sessionPath, 'Default', 'SingletonLock'),
      path.join(sessionPath, 'Default', 'SingletonCookie'),
      path.join(sessionPath, 'Default', 'SingletonSocket')
    ];
    lockFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`Limpando arquivo de trava: ${file}`);
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.error(`Erro ao remover trava ${file}:`, err);
        }
      }
    });
  } catch (e) {
    console.error('Falha ao limpar arquivos de trava do Puppeteer:', e);
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    authTimeoutMs: 120000, 
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--no-first-run'
      ]
    }
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('--- NOVO QR CODE GERADO ---');
    console.log('Escaneie o código abaixo no seu WhatsApp:');
    qrcodeTerminal.generate(qr, {small: true});
    try {
      lastQr = await qrcode.toDataURL(qr);
      console.log('QR Code formatado para exibição no Painel Web!');
    } catch (err) {
      console.error('Erro ao converter QR para DataURL:', err);
    }
    whatsappStatus = 'DISCONNECTED';
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client STATUS: PRONTO!');
    whatsappStatus = 'READY';
    lastQr = null;
    whatsappError = null;
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp STATUS: AUTENTICADO (carregando sessão)');
    whatsappStatus = 'AUTHENTRICATING';
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('WhatsApp STATUS: FALHA NA AUTENTICAÇÃO:', msg);
    whatsappStatus = 'DISCONNECTED';
    whatsappError = 'Falha na autenticação: ' + msg;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp STATUS: DESCONECTADO:', reason);
    whatsappStatus = 'DISCONNECTED';
    lastQr = null;
    whatsappClient = null;
    // Tenta reconectar em 10 segundos se foi desconexão acidental
    setTimeout(initWhatsApp, 10000);
  });

  whatsappClient.on('vote_update', async (vote: any) => {
    try {
      console.log('Vote update received:', vote);
      const voterIdRaw = vote.voter || vote.sender || vote.author || (vote.parentMessage && vote.parentMessage.from);
      if (!voterIdRaw) return;

      let voterId = '';
      if (typeof voterIdRaw === 'string') {
          voterId = voterIdRaw;
      } else if (typeof voterIdRaw === 'object') {
          voterId = voterIdRaw._serialized || voterIdRaw.id || '';
      }

      if (!voterId) return;
      const selectedOptions = vote.selectedOptions || [];
      
      // se selecionou alguma opção, vamos ver qual
      if (selectedOptions.length > 0) {
        const optionName = selectedOptions[0].name.toLowerCase();
        
        // Verifica se é a enquete de consolidação (Não quero mais receber)
        if (optionName.includes('não') || optionName.includes('nao') || optionName.includes('parar')) {
           // set user as opted-out
           let users = await storage.readCollection<any>('users');
           let userUpdated = false;
           
           for (let u of users) {
             if (!u.phone) continue;
             let clean = u.phone.replace(/\D/g, '');
             if (!clean.startsWith('55')) clean = '55' + clean;
             
             if (voterId.includes(clean) || (clean.length === 12 && voterId.includes(clean.substring(0,4) + '9' + clean.substring(4))) || (clean.length === 13 && voterId.includes(clean.substring(0,4) + clean.substring(5)))) {
                u.consolidationOptOut = true;
                if (u.memberStatus !== 'visitor' && u.memberStatus !== 'new_member') {
                     u.forceConsolidation = false;
                }
                userUpdated = true;
                break;
             }
           }
           
           if (userUpdated) {
             await storage.writeCollection('users', users);
             try {
                 await whatsappClient.sendMessage(voterId, 'Tudo bem! Você não receberá mais os convites automáticos da nossa igreja.');
             } catch (sendErr) {
                 console.error('Erro ao enviar mensagem de opt-out:', sendErr);
             }
           }
        } else if (optionName.includes('sim') || optionName.includes('continuar')) {
           let users = await storage.readCollection<any>('users');
           let userUpdated = false;
           for (let u of users) {
             if (!u.phone) continue;
             let clean = u.phone.replace(/\D/g, '');
             if (!clean.startsWith('55')) clean = '55' + clean;
             
             if (voterId.includes(clean) || (clean.length === 12 && voterId.includes(clean.substring(0,4) + '9' + clean.substring(4))) || (clean.length === 13 && voterId.includes(clean.substring(0,4) + clean.substring(5)))) {
                u.consolidationOptOut = false;
                if (u.memberStatus !== 'visitor' && u.memberStatus !== 'new_member') {
                     u.forceConsolidation = true;
                }
                userUpdated = true;
                break;
             }
           }
           if (userUpdated) {
             await storage.writeCollection('users', users);
             try {
                 await whatsappClient.sendMessage(voterId, 'Que bom! Continuaremos enviando nossos convites.');
             } catch (sendErr) {
                 console.error('Erro ao enviar mensagem de opt-in:', sendErr);
             }
           }
        }
        
        // Adicionar registro no CRM tickets (opcional mas bom para rastreio)
        let tickets = await storage.readCollection<any>('crmTickets');
        let ticket = tickets.find((t: any) => t.id === voterId);
        if (ticket) {
          const newMsg = {
             id: require('crypto').randomUUID(),
             ticketId: voterId,
             text: `[Voto em Enquete] Respondeu: ${selectedOptions[0].name}`,
             fromMe: false,
             timestamp: new Date().toISOString()
          };
          await storage.insert('crmMessages', newMsg);
          ticket.updatedAt = new Date().toISOString();
          ticket.unreadCount = (ticket.unreadCount || 0) + 1;
          ticket.lastMessage = `[Enquete] ${selectedOptions[0].name}`;
          await storage.writeCollection('crmTickets', tickets);
        }
      }
    } catch (err) {
      console.error('Error handling vote_update:', err);
    }
  });

  whatsappClient.on('message', async (msg: any) => {
    try {
      if (msg.from.includes('@g.us')) return; // ignore groups
      if (msg.from === 'status@broadcast') return; // ignore status updates
      
      const contact = await msg.getContact();
      const ticketId = msg.from;
      let text = msg.body;
      
      // Process simple text opt-out / opt-in
      const cleanText = text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
      console.log(`Received message: "${text}" | Cleaned: "${cleanText}" from ${ticketId}`);
      
      const matchPhone = (dbPhone: string, ticketIdStr: string): boolean => {
          const ticketPhone = ticketIdStr.split('@')[0].replace(/\D/g, '');
          const cleanDb = dbPhone.replace(/\D/g, '');
          
          const getPerms = (p: string) => {
              let clean = p;
              if (clean.startsWith('55') && clean.length >= 12) clean = clean.substring(2);
              const perms = [clean];
              if (clean.length === 11) {
                  perms.push(clean.substring(0,2) + clean.substring(3));
              } else if (clean.length === 10) {
                  perms.push(clean.substring(0,2) + '9' + clean.substring(2));
              }
              return perms;
          };
          
          const dbPerms = getPerms(cleanDb);
          const tkPerms = getPerms(ticketPhone);
          
          return dbPerms.some(dbP => tkPerms.includes(dbP));
      };

      if (cleanText === '1' || cleanText === 'nao quero' || cleanText === 'parar' || cleanText === 'parar de receber' || cleanText === 'me tira' || cleanText === 'cancelar convites' || cleanText === 'opt-out' || cleanText === 'opt out' || cleanText === 'nao enviar' || cleanText === 'sair') {
          console.log(`Matching opt-out for ${ticketId}`);
          let users = await storage.readCollection<any>('users');
          let userUpdated = false;
          
          for (let u of users) {
             if (!u.phone) continue;
             if (matchPhone(u.phone, ticketId)) {
                console.log(`User matched for opt-out: ${u.name} (${u.phone})`);
                u.consolidationOptOut = true;
                if (u.memberStatus !== 'visitor' && u.memberStatus !== 'new_member') {
                     u.forceConsolidation = false;
                }
                userUpdated = true;
             }
          }
          
          if (userUpdated) {
             await storage.writeCollection('users', users);
             try {
                await whatsappClient.sendMessage(ticketId, 'Tudo bem! Você não receberá mais os convites automáticos da nossa igreja.\n\nSe mudar de ideia, basta responder *2* para voltar a receber.');
             } catch (sendErr) {
                console.error('Erro ao enviar confirmação de opt-out:', sendErr);
             }
          } else {
             try {
                await whatsappClient.sendMessage(ticketId, 'Este número não foi encontrado na nossa base de dados. Peça para um administrador verificar o formato do seu número cadastrado. Agradecemos o contato!');
             } catch (sendErr) {
                console.error('Erro ao enviar fallback:', sendErr);
             }
          }
      } else if (cleanText === '2' || cleanText === 'quero receber' || cleanText === 'voltar a receber' || cleanText === 'receber convites' || cleanText === 'sim quero') {
          let users = await storage.readCollection<any>('users');
          let userUpdated = false;
          
          for (let u of users) {
             if (!u.phone) continue;
             if (matchPhone(u.phone, ticketId)) {
                u.consolidationOptOut = false;
                if (u.memberStatus !== 'visitor' && u.memberStatus !== 'new_member') {
                     u.forceConsolidation = true;
                }
                userUpdated = true;
             }
          }
          
          if (userUpdated) {
             await storage.writeCollection('users', users);
             try {
                await whatsappClient.sendMessage(ticketId, 'Que bom! Você voltou a receber nossos convites automáticos.');
             } catch (sendErr) {
                console.error('Erro ao enviar confirmação de opt-in:', sendErr);
             }
          } else {
             try {
                await whatsappClient.sendMessage(ticketId, 'Seu número não foi encontrado na nossa base de dados. Peça para um administrador cadastrar você diretamente no painel!');
             } catch (sendErr) {
                console.error('Erro ao enviar fallback:', sendErr);
             }
          }
      }
      
      // se for uma enquete, vamos extrair os dados da enquete para apresentar no CRM
      if (msg.type === 'poll_creation') {
        text = `[Enquete] ${msg.pollName}\n` + msg.pollOptions.map((o: any) => `- ${o.name}`).join('\n');
      }
      
      let tickets = await storage.readCollection<any>('crmTickets');
      let ticket = tickets.find((t: any) => t.id === ticketId);
      
      if (!ticket) {
        ticket = {
          id: ticketId,
          phoneNumber: contact.number,
          contactName: contact.name || contact.pushname || contact.number,
          status: 'open',
          assignedTo: null,
          updatedAt: new Date().toISOString(),
          unreadCount: 1,
          lastMessage: text
        };
        await storage.insert('crmTickets', ticket);
      } else {
        if (ticket.status === 'closed') {
          ticket.assignedTo = null; // Re-open unassigned so someone can pick it up
        }
        ticket.status = 'open';
        ticket.updatedAt = new Date().toISOString();
        ticket.unreadCount = (ticket.unreadCount || 0) + 1;
        ticket.lastMessage = text;
        ticket.contactName = contact.name || contact.pushname || contact.number || ticket.contactName; 
        await storage.update('crmTickets', ticket.id, ticket);
      }
      
      const newMsg = {
        id: msg.id.id || require('crypto').randomUUID(),
        ticketId: ticketId,
        text: text,
        fromMe: false,
        timestamp: new Date().toISOString()
      };
      await storage.insert('crmMessages', newMsg);
    } catch (e) {
      console.error('Error handling incoming WA message:', e);
    }
  });

  try {
    await whatsappClient.initialize();
  } catch (err: any) {
    console.error('ERRO CRÍTICO NA INICIALIZAÇÃO DO WHATSAPP:', err);
    whatsappError = err.message || String(err);
    
    if (whatsappError.includes('Code: 127')) {
      whatsappError = "Erro 127: Faltam bibliotecas do Chrome no seu Linux (Ubuntu). Execute os comandos de 'Hospedagem' no admin.";
    }

    whatsappStatus = 'DISCONNECTED';
    if (whatsappClient) {
        try { await whatsappClient.destroy(); } catch(e) {}
    }
    whatsappClient = null;
  }
}

// Process cleanup
async function cleanupAndExit() {
  if (whatsappClient) {
    try {
      console.log('Destroying WhatsApp client...');
      await whatsappClient.destroy();
    } catch (e) {
      console.error('Error destroying WhatsApp client:', e);
    }
  }
  process.exit(0);
}

let versesCache: any[] | null = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

async function getDailyVerse(specificDate?: string) {
    const now = Date.now();
    
    // Refresh cache se necessário
    if (!versesCache || (now - lastCacheRefresh > CACHE_TTL_MS)) {
        versesCache = await storage.readCollection<any>("verses");
        lastCacheRefresh = now;
    }
    
    const verses = versesCache;
    if (!verses || verses.length === 0) return null;

    const history = await storage.readCollection<any>("verseHistory") || [];
    const targetDate = specificDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if verse for today already selected
    let selectedVerse: any;
    const dateEntry = history.find(entry => entry.date === targetDate);
    if (dateEntry) {
        selectedVerse = verses.find(v => v.id === dateEntry.verseId);
    } else {
        // Select new verse
        const history180DaysAgo = new Date();
        history180DaysAgo.setDate(history180DaysAgo.getDate() - 180);
        const history180DaysAgoStr = history180DaysAgo.toISOString().split('T')[0];
        
        // Filtra histórico para pegar ordens de versículos usados recently
        const recentVerseUsedIds = new Set(history
            .filter(entry => entry.date >= history180DaysAgoStr)
            .map(entry => entry.verseId));
            
        const candidateVerses = verses.filter(v => !recentVerseUsedIds.has(v.id));
        
        if (candidateVerses.length > 0) {
            selectedVerse = candidateVerses[Math.floor(Math.random() * candidateVerses.length)];
        } else {
            // Se todos foram usados nos últimos 180 dias, escolhe qualquer um aleatório
            selectedVerse = verses[Math.floor(Math.random() * verses.length)];
        }
        
        // Save to history
        await storage.insert("verseHistory", { id: uuidv4(), verseId: selectedVerse.id, date: targetDate });
    }

    if (selectedVerse && (!selectedVerse.text || selectedVerse.text.startsWith('Texto') || selectedVerse.text.startsWith('Carregando'))) {
        try {
            const fetchedText = await fetchVerseText(selectedVerse.ref, 'acf');
            if (fetchedText) {
                selectedVerse = { ...selectedVerse, text: fetchedText };
                
                // Update in DB so we don't fetch from external API repeatedly
                await storage.update<any>("verses", selectedVerse.id, { text: fetchedText });
                
                // Also update local cache
                const verseInCache = verses.find((v: any) => v.id === selectedVerse.id);
                if (verseInCache) {
                    verseInCache.text = fetchedText;
                }
            }
        } catch (err) {
            console.error('Failed to fetch verse text in server:', err);
        }
    }
    
    return selectedVerse;
}

process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
process.on('SIGUSR2', cleanupAndExit); // for nodemon/tsx restarts

// Start WhatsApp on boot
initWhatsApp();

// Schedule birthday notifications at 00:00 every day
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily birthday check...');
    try {
        const users = await storage.readCollection<any>("users");
        const configs = await storage.readCollection<any>("config");
        const wpConfig = configs.find((c: any) => c.id === 'whatsapp') || {};

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const currentYear = today.getFullYear();

        const todayBirthdays = users.filter(u => {
            if (!u.birthDate) return false;
            const parts = u.birthDate.split('-');
            if (parts.length !== 3) return false;
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            return month === currentMonth && day === currentDay;
        });

        if (todayBirthdays.length > 0) {
            // 1. Send group/admin notification
            let msg = "🎂 *Aniversariantes de Hoje:*\n\n";
            todayBirthdays.forEach(u => {
                const parts = u.birthDate.split('-');
                const year = parseInt(parts[0], 10);
                const age = currentYear - year;
                msg += `- ${u.name} (${age} anos)\n`;
            });
            await sendWhatsAppNotifications(msg);
            console.log('Daily birthday notification sent to admins.');

            // 2. Send direct notifications if enabled
            if (wpConfig.enableDirectBirthday && wpConfig.birthdayTemplate) {
                for (const u of todayBirthdays) {
                    if (u.phone) {
                        const parts = u.birthDate.split('-');
                        const year = parseInt(parts[0], 10);
                        const age = currentYear - year;
                        
                        let directMsg = wpConfig.birthdayTemplate
                            .replace(/{{nome}}/gi, u.name)
                            .replace(/{{idade}}/gi, age.toString());

                        try {
                            const formattedPhone = await getWhatsAppChatId(u.phone);
                            if (formattedPhone) {
                                await whatsappClient?.sendMessage(formattedPhone, directMsg);
                                console.log(`Direct birthday message sent to ${u.name}`);
                            }
                        } catch (err) {
                            console.error(`Failed to send direct birthday message to ${u.name}:`, err);
                        }
                    }
                }
            }
        } else {
            console.log('No birthdays today.');
        }
    } catch (e) {
        console.error('Failed to send scheduled birthday notification:', e);
    }
}, {
    timezone: "America/Sao_Paulo"
});

// Schedule ministry notifications (3 days before)
cron.schedule('30 8 * * *', async () => {
    console.log('Running ministry schedule reminder check...');
    try {
        const schedules = await storage.readCollection<any>("ministrySchedules");
        const users = await storage.readCollection<any>("users");
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + 3);
        
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const upcomingSchedules = schedules.filter(s => s.date === targetDateStr);
        
        for (const schedule of upcomingSchedules) {
            for (const userId of schedule.assignedUserIds) {
                const user = users.find(u => u.id === userId);
                if (user && user.phone) {
                    const chatId = await getWhatsAppChatId(user.phone);
                    if (chatId) {
                        const message = `📢 *Lembrete de Escala*\n\nOlá *${user.name}*, você está escalado para o ministério no dia *${new Date(schedule.date).toLocaleDateString('pt-BR')}* às *${schedule.time}*.\n\n📍 Local: ${schedule.location}\n📝 Evento: ${schedule.title}\n\n*Por favor, confirme sua presença no aplicativo ou responda aqui.*`;
                        await whatsappClient.sendMessage(chatId, message);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to run ministry reminders:', e);
    }
}, {
    timezone: "America/Sao_Paulo"
});

// Automated daily backup at 23:00
cron.schedule('0 23 * * *', async () => {
  console.log('Iniciando backup automático diário...');
  try {
      const dataDir = path.join(process.cwd(), 'data');
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const filename = `backup-dia${day}-as-${hour}hrs.zip`;
      const filePath = path.join(backupDir, filename);
      
      const zip = new AdmZip();
      zip.addLocalFolder(dataDir, 'data');
      
      const uDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uDir)) {
        zip.addLocalFolder(uDir, 'uploads');
      }

      zip.writeZip(filePath);
      console.log(`Backup automático concluído localmente: ${filename}`);

      // Enviar para nuvem se configurado
      const configs = await storage.readCollection<any>("config");
      const cloudConfig = configs.find((c: any) => c.id === "cloudBackup");

      if (cloudConfig?.telegramEnabled && cloudConfig.telegramToken && cloudConfig.telegramChatId) {
        console.log('Enviando backup para Telegram...');
        const form = new FormData();
        form.append('chat_id', cloudConfig.telegramChatId);
        form.append('caption', `📦 *Backup Automático Diário*\n📅 ${new Date().toLocaleString('pt-BR')}`);
        
        const fileBuffer = fs.readFileSync(filePath);
        form.append('document', new File([fileBuffer], 'backup-automatico.zip', { type: 'application/zip' }));

        const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, '');
        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
          method: 'POST',
          body: form as any
        });

        if (response.ok) {
          console.log('Backup enviado com sucesso para o Telegram!');
        } else {
          const errData = await response.json();
          console.error('Erro ao enviar para Telegram:', errData);
        }
      }
  } catch (e) {
      console.error('Falha no backup automático:', e);
  }
}, {
  timezone: "America/Sao_Paulo"
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Atrás de nginx, Cloudflare ou similar, defina TRUST_PROXY=true no .env
  // para que `req.ip` traga o IP real do usuário e não o do proxy.
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  }

  app.use(cors());
  // Era 200mb, o que permitia derrubar o servidor por consumo de memória com
  // uma única requisição. Arquivos grandes sobem por /api/upload (multer), que
  // grava em disco em vez de carregar tudo na memória.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
  }
  app.use('/uploads', express.static(uploadsDir));

  // --- Helper to ensure Super Admin exists ---
  const ensureSuperAdmin = async () => {
    try {
      const users = await storage.readCollection<any>("users");
      const hasSuperAdmin = users.find(u => u.role === "superadmin" || u.email === "admin");
      
      if (!hasSuperAdmin) {
        console.log("Criando Super Admin inicial...");

        // Antes a senha era "admin", fixa no código. Como o app é público,
        // isso equivalia a deixar o sistema aberto. Agora: usa a senha do .env
        // ou sorteia uma e obriga a troca no primeiro acesso.
        const envPassword = process.env.SUPERADMIN_PASSWORD;
        const generated = !envPassword;
        const plainPassword = envPassword || crypto.randomBytes(9).toString("base64url");

        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const superAdmin = {
          id: uuidv4(),
          name: "Super Administrador",
          email: process.env.SUPERADMIN_EMAIL || "admin",
          password: hashedPassword,
          role: "superadmin",
          mustChangePassword: true,
          createdAt: new Date().toISOString()
        };
        await storage.insert("users", superAdmin);

        console.log("=".repeat(64));
        console.log(`Super Admin criado. Login: ${superAdmin.email}`);
        if (generated) {
          console.log(`Senha sorteada: ${plainPassword}`);
          console.log("Anote agora — ela não será exibida de novo.");
        } else {
          console.log("Senha: a definida em SUPERADMIN_PASSWORD no .env");
        }
        console.log("A troca de senha será exigida no primeiro acesso.");
        console.log("=".repeat(64));
      }
    } catch (e) {
      console.error("Erro ao garantir Super Admin:", e);
    }
  };

  await ensureSuperAdmin();
  
  const ensureMinistries = async () => {
    try {
      const ministries = await storage.readCollection<any>("ministries");
      if (ministries.length === 0) {
        console.log("Criando ministérios padrão...");
        const defaultMinistries = [
          {
            id: uuidv4(),
            name: "Louvor e Adoração",
            description: "Ministério responsável pela música e direção do louvor nos cultos.",
            category: "Celebração",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000",
            createdAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: "Mídia e Tecnologia",
            description: "Responsável pela transmissão ao vivo, projeção, redes sociais e site.",
            category: "Suporte",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000",
            createdAt: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: "Intercessão",
            description: "Grupo dedicado à oração e cobertura espiritual da igreja e membros.",
            category: "Espiritual",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1499209974431-9014009774a7?q=80&w=1000",
            createdAt: new Date().toISOString()
          }
        ];
        for (const m of defaultMinistries) {
          await storage.insert("ministries", m);
        }
      }
    } catch (e) {
      console.error("Erro ao garantir ministérios:", e);
    }
  };

  await ensureMinistries();

  const ensureVerses = async () => {
    try {
      const result = await seedVerses();
      if (result.status === 'success') {
        console.log(`Seeding de versículos concluído: ${result.count} versículos cadastrados.`);
      }
    } catch (e) {
      console.error("Erro ao garantir versículos:", e);
    }
  };

  await ensureVerses();

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // --- Middleware for Auth ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Não autorizado" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Sessão expirada ou token inválido" });
      req.user = user;
      next();
    });
  };

  // --- Limite de tentativas nos endpoints de autenticação ---
  //
  // Sem isso é possível testar senhas indefinidamente, e principalmente
  // adivinhar o código de 6 dígitos da recuperação por WhatsApp.
  //
  // A contagem é por IP + e-mail informado: assim, se toda a igreja estiver
  // atrás do mesmo IP (wifi do templo, ou um proxy sem TRUST_PROXY), o bloqueio
  // de uma conta não derruba o login das outras pessoas.
  const authAttempts = new Map<string, { count: number; firstAt: number }>();
  const AUTH_WINDOW_MS = 15 * 60 * 1000;
  const AUTH_MAX_ATTEMPTS = 15;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authAttempts) {
      if (now - entry.firstAt > AUTH_WINDOW_MS) authAttempts.delete(key);
    }
  }, AUTH_WINDOW_MS).unref();

  const rateLimitAuth = (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || 'desconhecido';
    const email = String(req.body?.email || '').toLowerCase();
    const key = `${req.path}:${ip}:${email}`;
    const now = Date.now();
    const entry = authAttempts.get(key);

    if (!entry || now - entry.firstAt > AUTH_WINDOW_MS) {
      authAttempts.set(key, { count: 1, firstAt: now });
      return next();
    }

    entry.count++;
    if (entry.count > AUTH_MAX_ATTEMPTS) {
      const minutos = Math.max(1, Math.ceil((AUTH_WINDOW_MS - (now - entry.firstAt)) / 60000));
      console.warn(`[Auth] Limite de tentativas atingido: ${key}`);
      return res.status(429).json({
        error: `Muitas tentativas. Aguarde ${minutos} minuto(s) e tente novamente.`
      });
    }
    next();
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/public-config", async (req, res) => {
    try {
      const config = await storage.readCollection<any>("config");
      const appearance = config.find((c: any) => c.id === 'appearance');
      res.json({
        loginLogoLight: appearance?.loginLogoLight || null,
        loginLogoDark: appearance?.loginLogoDark || null,
        colorPrimary: appearance?.colorPrimary || null,
        colorSecondary: appearance?.colorSecondary || null,
        colorPrimaryLight: appearance?.colorPrimaryLight || null,
        colorAccent: appearance?.colorAccent || null,
        colorPrimaryDark: appearance?.colorPrimaryDark || null,
        colorSecondaryDark: appearance?.colorSecondaryDark || null,
        colorPrimaryLightDark: appearance?.colorPrimaryLightDark || null,
        colorAccentDark: appearance?.colorAccentDark || null,
        defaultTheme: appearance?.defaultTheme || null,
        churchName: appearance?.churchName || null,
        churchInstagram: appearance?.churchInstagram || null,
        enabledModules: appearance?.enabledModules || null,
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao carregar configurações públicas" });
    }
  });

  /**
   * Endereços que o proxy nunca deve acessar: rede local, loopback e a faixa
   * 169.254.x.x, usada pelos serviços de metadados das nuvens (onde ficam as
   * credenciais da máquina).
   */
  const isPrivateAddress = (ip: string): boolean => {
    if (net.isIPv4(ip)) {
      const [a, b] = ip.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127) return true;
      if (a === 169 && b === 254) return true;              // link-local / metadados
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;    // CGNAT
      return false;
    }
    const v6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
    return v6 === '::1' || v6 === '::' ||
      v6.startsWith('fc') || v6.startsWith('fd') ||         // rede privada IPv6
      v6.startsWith('fe80') ||                              // link-local
      v6.startsWith('::ffff:127.') || v6.startsWith('::ffff:10.');
  };

  /** Valida protocolo e destino de uma URL antes do proxy buscá-la. */
  const assertSafeProxyTarget = async (raw: string): Promise<URL> => {
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      throw new Error('URL inválida');
    }

    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      throw new Error('Protocolo não permitido');
    }

    // Se o host já for um IP, valida direto; senão resolve o DNS primeiro
    const resolved = net.isIP(target.hostname)
      ? target.hostname
      : (await dns.promises.lookup(target.hostname)).address;

    if (isPrivateAddress(resolved)) {
      throw new Error('Destino não permitido');
    }

    return target;
  };

  /**
   * Proxy de imagens, usado pelas telas que precisam desenhar logos externos
   * sem cair em bloqueio de CORS (inclusive na tela de login, por isso não
   * exige autenticação).
   *
   * Antes ele buscava qualquer endereço que recebesse, o que permitia usar o
   * servidor para varrer a rede interna da hospedagem (SSRF). Agora o destino
   * é validado, os redirecionamentos são revalidados um por um, e a resposta
   * precisa ser de fato uma imagem.
   */
  app.get("/api/proxy-image", async (req, res) => {
    const MAX_REDIRECTS = 3;
    const MAX_BYTES = 10 * 1024 * 1024;

    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send('URL is required');

      let current = await assertSafeProxyTarget(imageUrl);
      let response: Response | null = null;

      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        response = await fetch(current.toString(), {
          redirect: 'manual', // seguir automaticamente burlaria a validação
          signal: AbortSignal.timeout(10000),
        });

        if (response.status < 300 || response.status >= 400) break;

        const location = response.headers.get('location');
        if (!location) break;

        // Revalida cada salto: um redirect poderia apontar para a rede interna
        current = await assertSafeProxyTarget(new URL(location, current).toString());
        response = null;
      }

      if (!response || !response.ok) {
        return res.status(502).send('Não foi possível carregar a imagem');
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return res.status(400).send('O endereço informado não retornou uma imagem');
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        return res.status(413).send('Imagem muito grande');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      // Sem devolver a mensagem interna ao cliente, para não vazar detalhes
      console.error('Image proxy error:', err?.message || err);
      res.status(400).send('Não foi possível carregar a imagem');
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.id === userId);
      
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      
      if (currentPassword) {
        if (!(await bcrypt.compare(currentPassword, user.password))) {
          return res.status(400).json({ error: "Senha atual incorreta" });
        }
      } else if (!user.mustChangePassword) {
         return res.status(400).json({ error: "A senha atual é obrigatória para esta operação." });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.update<any>("users", userId, { 
        password: hashedPassword,
        mustChangePassword: false 
      });
      
      res.json({ success: true, message: "Senha alterada com sucesso." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // Export all data for a user
  app.get("/api/users/:userId/export", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Acesso não autorizado" });
    const { userId } = req.params;
    try {
        const dataDir = path.join(process.cwd(), 'data');
        const files = await fs.promises.readdir(dataDir);
        const collections = files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
        
        const exportData: any = {};
        for(const coll of collections) {
            const data = await storage.readCollection<any>(coll);
            exportData[coll] = data.filter((item: any) => item.userId === userId || item.memberIds?.includes(userId) || item.id === userId);
        }
        res.json(exportData);
    } catch (e) {
        res.status(500).json({ error: "Erro ao exportar dados" });
    }
  });

  // Delete all data for a user
  // Listas que guardam ids de usuários. Ao excluir uma conta, o id é retirado
  // dessas listas — o registro em si (ministério, célula, chamada) é mantido.
  const USER_ID_ARRAY_FIELDS = [
    'memberIds', 'leaderIds', 'pendingRequestIds', 'membersList', 'members',
    'presentMembers', 'absentMembers', 'prayedBy', 'likes',
  ];

  /**
   * Remove o usuário e todos os dados pessoais dele.
   *
   * A versão anterior excluía qualquer registro cujo `memberIds` contivesse o
   * usuário — ou seja, apagar um membro apagava também os ministérios e as
   * células dos quais ele participava. Agora só o id sai das listas.
   */
  async function purgeUserData(userId: string): Promise<string[]> {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.promises.readdir(dataDir).catch(() => [] as string[]);
    const collections = files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
    const touched: string[] = [];

    for (const coll of collections) {
      const data = await storage.readCollection<any>(coll);
      let changed = false;

      // 1. Remove os registros que pertencem ao usuário
      const kept = data.filter((item: any) => {
        const isOwn =
          item?.id === userId ||
          item?.uid === userId ||
          item?.userId === userId ||
          item?.memberId === userId ||
          item?.authorId === userId;
        if (isOwn) changed = true;
        return !isOwn;
      });

      // 2. Retira o id das listas de participantes dos registros restantes
      for (const item of kept) {
        for (const field of USER_ID_ARRAY_FIELDS) {
          if (Array.isArray(item?.[field]) && item[field].includes(userId)) {
            item[field] = item[field].filter((id: string) => id !== userId);
            changed = true;
          }
        }
      }

      if (changed) {
        await storage.writeCollection(coll, kept);
        touched.push(coll);
      }
    }

    return touched;
  }

  /**
   * Exclusão da PRÓPRIA conta pelo usuário.
   *
   * Exigência da Política de Exclusão de Dados da Google Play: o app precisa
   * oferecer esse caminho dentro dele, além de um endereço web equivalente.
   */
  app.post("/api/auth/delete-account", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { password } = req.body || {};

      const users = await storage.readCollection<any>("users");
      const user = users.find((u: any) => u.id === userId);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      if (user.role === 'superadmin') {
        return res.status(400).json({
          error: "A conta de Super Administrador não pode ser excluída pelo aplicativo."
        });
      }

      // Confirmação por senha: impede que uma sessão roubada apague a conta
      if (!password || !user.password || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Senha incorreta. A conta não foi excluída." });
      }

      const touched = await purgeUserData(userId);
      console.log(`[LGPD] Conta ${userId} excluída pelo próprio usuário. Coleções afetadas: ${touched.join(', ') || 'nenhuma'}`);

      res.json({
        success: true,
        message: "Sua conta e seus dados pessoais foram excluídos permanentemente."
      });
    } catch (e) {
      console.error("Erro ao excluir a própria conta:", e);
      res.status(500).json({ error: "Erro ao excluir a conta" });
    }
  });

  app.delete("/api/users/:userId/delete", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Acesso não autorizado" });
    const { userId } = req.params;
    try {
        const touched = await purgeUserData(userId);
        res.json({ message: "Dados do usuário excluídos com sucesso", collections: touched });
    } catch (e) {
        console.error("Erro ao excluir dados do usuário:", e);
        res.status(500).json({ error: "Erro ao excluir dados" });
    }
  });

  // Temporary fix for placeholder verses
  app.get("/api/verses/fix-placeholders", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'superadmin') return res.status(403).end();
      const verses = await storage.readCollection<any>("verses");
      let fixedCount = 0;
      for (const v of verses) {
          if (v.text === 'Texto será buscado na Bíblia no momento da visualização.') {
              // We cannot call fetchVerseText here easily as it's a client lib
              // But we can mark them for client-side update or just manually update if we had the text.
              // Actually, simply leaving them as is or removing the placeholder works.
          }
      }
      res.json({ fixedCount });
  });

  // --- Auth API ---
  app.post("/api/auth/register", rateLimitAuth, async (req, res) => {
    try {
      const { name, email, password, birthDate, address, phone } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await storage.readCollection<any>("users");
      
      // Check if user already exists (by email or phone)
      const existingUser = users.find(u => 
        (u.email && u.email.toLowerCase() === normalizedEmail) || 
        (phone && u.phone && u.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );

      if (existingUser) {
        // If it was a pre-registration (visitor) and doesn't have a password yet
        if (existingUser.isPreRegistered && !existingUser.password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const conversionNote = {
            id: uuidv4(),
            text: "Cadastro completado pelo usuário via aplicativo.",
            date: new Date().toISOString(),
            authorName: "Sistema",
            type: "status_change"
          };

          const updatedUser = {
            ...existingUser,
            name: name || existingUser.name,
            email: normalizedEmail,
            password: hashedPassword,
            birthDate: birthDate || existingUser.birthDate || "",
            address: address || existingUser.address || "",
            phone: phone || existingUser.phone || "",
            memberStatus: "new_member", 
            integrationNotes: [...(existingUser.integrationNotes || []), conversionNote],
            joinedAt: existingUser.joinedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPreRegistered: false 
          };

          await storage.update("users", existingUser.id, updatedUser);
          
          const { password: _, ...userWithoutPassword } = updatedUser;
          const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role, name: updatedUser.name }, JWT_SECRET, { expiresIn: '30d' });
          return res.json({ user: userWithoutPassword, token });
        } else if (normalizedEmail === "admin") {
           return res.status(400).json({ error: "E-mail reservado" });
        } else {
          return res.status(400).json({ error: "E-mail ou telefone já cadastrado" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: uuidv4(),
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "member",
        birthDate: birthDate || "",
        address: address || "",
        phone: phone || "",
        memberStatus: "new_member",
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await storage.insert("users", newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro ao registrar" });
    }
  });

  app.post("/api/auth/login", rateLimitAuth, async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: "Erro ao entrar" });
    }
  });

  app.post("/api/auth/reset-password", rateLimitAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: "E-mail não encontrado no sistema" });
      }

      if (!user.phone) {
        return res.status(400).json({ error: "O usuário não possui telefone cadastrado para recuperar a senha." });
      }

      if (!whatsappClient || whatsappStatus !== 'READY') {
          return res.status(500).json({ error: "O sistema de WhatsApp da igreja não está conectado no momento. Tente novamente mais tarde ou contate um administrador." });
      }

      const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await storage.update<any>("users", user.id, { 
        password: hashedPassword,
        mustChangePassword: true
      });
      
      const message1 = `Olá *${user.name}*, 👋\n\nSua senha temporária para acessar o aplicativo da igreja é a seguinte:\n\n👇 Copie o código abaixo e cole no aplicativo. Recomendamos que você altere sua senha no menu "Perfil" após acessar o sistema.`;
      const message2 = `${tempPassword}`;
      
      const chatId = await getWhatsAppChatId(user.phone);
      if (chatId) {
          await whatsappClient.sendMessage(chatId, message1);
          await whatsappClient.sendMessage(chatId, message2);
          res.json({ success: true, message: "Nova senha enviada para seu WhatsApp cadastrado com sucesso!" });
      } else {
          // Revert password change if WhatsApp sending fails? Or just return error
          return res.status(500).json({ error: "Não foi possível enviar mensagem para este número do WhatsApp. Verifique se o número está correto." });
      }

    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Erro interno ao redefinir a senha" });
    }
  });

  // --- Generic Data API ---
  app.get("/api/sysinfo", authenticateToken, (req, res) => {
    try {
      const freeMemory = os.freemem();
      const totalMemory = os.totalmem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2);
      const loadAvg = os.loadavg();
      res.json({
        memoryUsage: Number(memoryUsage),
        freeMemory,
        totalMemory,
        loadAvg,
        uptime: Math.floor(process.uptime()),
        paths: {
          data: path.resolve(process.cwd(), 'data'),
          uploads: path.resolve(process.cwd(), 'uploads'),
          cwd: process.cwd()
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao ler statos do sistema" });
    }
  });

  app.post("/api/whatsapp/reset", authenticateToken, async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') return res.status(403).send("Acesso negado");
    console.log('Reiniciando WhatsApp via Painel Admin...');
    if (whatsappClient) {
      try { await whatsappClient.destroy(); } catch(e) {}
      whatsappClient = null;
    }
    whatsappStatus = 'DISCONNECTED';
    initWhatsApp();
    res.json({ ok: true });
  });

  app.get("/api/docs/:filename", authenticateToken, (req, res) => {
    const { filename } = req.params;
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = path.join(process.cwd(), 'docs', safeFilename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ content });
    } else {
      res.status(404).json({ error: "Documento não encontrado" });
    }
  });

  app.post("/api/system/update", authenticateToken, async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin') return res.status(403).send("Acesso negado");
    
    const { exec } = await import('child_process');
    
    // Passo -1: Enviar ZIP caso o Telegram esteja configurado (Backup que pode ser restaurado no painel)
    try {
      const configs = await storage.readCollection<any>("config");
      const cloudConfig = configs.find((c: any) => c.id === "cloudBackup");

      if (cloudConfig?.telegramEnabled && cloudConfig.telegramToken && cloudConfig.telegramChatId) {
        console.log('Enviando backup via Telegram antes de atualizar...');
        const zipTele = new AdmZip();
        const localDataDir = path.join(process.cwd(), 'data');
        const uDir = path.join(process.cwd(), 'uploads');
        
        if (fs.existsSync(localDataDir)) zipTele.addLocalFolder(localDataDir, 'data');
        if (fs.existsSync(uDir)) zipTele.addLocalFolder(uDir, 'uploads');
        
        const tempPreUpdatePath = path.join(process.cwd(), `backup-pre-update-${new Date().getTime()}.zip`);
        zipTele.writeZip(tempPreUpdatePath);
        
        const formTele = new FormData();
        formTele.append('chat_id', cloudConfig.telegramChatId);
        formTele.append('caption', `📦 *Backup de Segurança Pré-Atualização*\n📅 ${new Date().toLocaleString('pt-BR')}`);
        
        const fileBuffer = fs.readFileSync(tempPreUpdatePath);
        formTele.append('document', new File([fileBuffer], 'backup-pre-update.zip', { type: 'application/zip' }));

        const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, '');
        const responseTele = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
          method: 'POST',
          body: formTele as any
        });
        
        if (!responseTele.ok) {
            console.error('Falha ao enviar backup Telegram pré-update:', await responseTele.text());
        } else {
            console.log('Backup do Telegram enviado com sucesso!');
        }
        
        try { fs.unlinkSync(tempPreUpdatePath); } catch (e) {}
      }
    } catch (teleErr) {
        console.error('Erro na rotina de backup do Telegram:', teleErr);
    }
    
    // Passo 0: Backup de Segurança (Snapshot antes da atualização)
    const backupDir = path.join(process.cwd(), 'backups/system_snapshots');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const snapshotName = `safety-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    const snapshotPath = path.join(backupDir, snapshotName);
    
    try {
      console.log('Criando snapshot de segurança...');
      const zip = new AdmZip();
      
      // Adiciona arquivos do root (exceto pastas grandes/temp)
      const files = fs.readdirSync(process.cwd());
      for (const file of files) {
          const fullPath = path.join(process.cwd(), file);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
              // Ignorar o que não precisa de backup ou é muito grande
              if (['node_modules', '.git', 'dist', 'backups', 'uploads', '.next'].includes(file)) continue;
              zip.addLocalFolder(fullPath, file);
          } else {
              zip.addLocalFile(fullPath);
          }
      }
      zip.writeZip(snapshotPath);
      console.log(`Snapshot criado: ${snapshotName}`);
    } catch (e) {
      console.error('Falha ao criar snapshot de segurança, mas prosseguindo com update:', e);
    }

    // Comando mais robusto: limpa, puxa código, instala dependências e builda
    const command = 'git fetch origin main && git reset --hard origin/main && npm install --include=dev && npm run build && (pm2 save || true)';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro na Atualização: ${error.message}`);
        // Log de erro para depuração futura
        try { fs.appendFileSync('update_error.log', `${new Date().toISOString()}: ${error.message}\n${stderr}\n`); } catch(e) {}
        return res.status(500).json({ error: error.message, details: stderr });
      }
      console.log(`Sistema Atualizado e Buildado: ${stdout}`);
      
      // Respond first, then restart
      res.json({ 
        ok: true, 
        output: stdout, 
        message: "O servidor foi atualizado, as dependências instaladas e o build concluído. Reiniciando em 3 segundos..." 
      });
      
      setTimeout(() => {
        console.log('Reiniciando processo para aplicação de atualizações...');
        process.exit(0);
      }, 3000);
    });
  });

  app.get("/api/backup", authenticateToken, async (req, res) => {
    try {
      // Return a JSON containing all collections
      const collections = [
        'users', 'events', 'prayers', 'announcements', 'cells', 
        'readingPlans', 'pastoralVisits', 'titheTransactions', 
        'attendances', 'config', 'ministries', 'ministrySchedules', 'adminRoles', 'eventRegistrations'
      ];
      const backup: any = {};
      for (const c of collections) {
        backup[c] = await storage.readCollection(c);
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=igreja_backup_${new Date().toISOString().split('T')[0]}.json`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
       res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });

  app.get("/api/backup/zip", authenticateToken, async (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const uDir = path.join(process.cwd(), 'uploads');

      const zip = new AdmZip();
      zip.addLocalFolder(dataDir, 'data');
      if (fs.existsSync(uDir)) {
        zip.addLocalFolder(uDir, 'uploads');
      }
      
      const buffer = zip.toBuffer();

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const filename = `backup-dia${day}-as-${hour}hrs.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar ZIP de backup:", error);
      res.status(500).json({ error: "Erro ao gerar backup ZIP" });
    }
  });

  app.post("/api/backup/test-cloud", authenticateToken, async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') return res.status(403).send("Acesso negado");

    try {
      const configs = await storage.readCollection<any>("config");
      const cloudConfig = configs.find((c: any) => c.id === "cloudBackup");

      if (!cloudConfig?.telegramToken || !cloudConfig.telegramChatId) {
        return res.status(400).json({ error: "Configuração do Telegram incompleta ou não encontrada" });
      }

      const zip = new AdmZip();
      const localDataDir = path.join(process.cwd(), 'data');
      zip.addLocalFolder(localDataDir, 'data');
      
      const uDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uDir)) {
        zip.addLocalFolder(uDir, 'uploads');
      }
      
      const tempTestePath = path.join(process.cwd(), `teste-backup-${new Date().getTime()}.zip`);
      zip.writeZip(tempTestePath);

      const form = new FormData();
      form.append('chat_id', cloudConfig.telegramChatId);
      form.append('caption', `🧪 *Teste de Backup*\n📅 ${new Date().toLocaleString('pt-BR')}`);
      
      const fileBuffer = fs.readFileSync(tempTestePath);
      form.append('document', new File([fileBuffer], 'teste-backup.zip', { type: 'application/zip' }));

      const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, '');
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
        method: 'POST',
        body: form as any
      });
      
      try { fs.unlinkSync(tempTestePath); } catch (e) {}

      if (response.ok) {
        res.json({ ok: true });
      } else {
        const errData = await response.json();
        res.status(500).json({ error: "Falha ao enviar para Telegram", details: errData });
      }
    } catch (error: any) {
      console.error("Erro no teste de backup:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/backup/import-chunk", authenticateToken, upload.single('chunk'), async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') return res.status(403).send("Acesso negado");

    const file = (req as any).file;
    if (!file) return res.status(400).send("Chunk não enviado");

    try {
      const { chunkIndex, totalChunks, uploadId } = req.body;
      const tempDir = path.join(process.cwd(), 'temp_uploads');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      
      const finalZipPath = path.join(tempDir, `${uploadId}.zip`);
      const chunkBuffer = fs.readFileSync(file.path);
      
      // Append content in order
      fs.appendFileSync(finalZipPath, chunkBuffer);
      try { fs.unlinkSync(file.path); } catch (e) {}
      
      console.log(`Receiving chunk ${parseInt(chunkIndex) + 1} of ${totalChunks}...`);
      
      if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
        // Last chunk, extract
        console.log(`All chunks received! Extracting file...`);
        const zip = new AdmZip(finalZipPath);
        const cwd = process.cwd();
        
        // --- PRESERVE NOTIFICATIONS & USERS ---
        let existingPushSubscriptions = null;
        let existingUsers = null;
        try {
            const pushPath = path.join(cwd, 'data', 'push_subscriptions.json');
            if (fs.existsSync(pushPath)) {
                existingPushSubscriptions = fs.readFileSync(pushPath, 'utf-8');
            }
            const usersPath = path.join(cwd, 'data', 'users.json');
            if (fs.existsSync(usersPath)) {
                existingUsers = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
            }
        } catch(e) { console.error('Erro lendo config previa', e) }
        // ------------------------------------

        const entries = zip.getEntries();
        let extractedCount = 0;
        for (const entry of entries) {
          try {
            if (!entry.isDirectory) {
              zip.extractEntryTo(entry, cwd, true, true);
              extractedCount++;
            }
          } catch (innerErr: any) {
            console.error(`Erro ao extrair ${entry.entryName}:`, innerErr);
          }
        }
        
        // --- RESTORE NOTIFICATIONS & USERS ---
        try {
            if (existingPushSubscriptions) {
                fs.writeFileSync(path.join(cwd, 'data', 'push_subscriptions.json'), existingPushSubscriptions);
            }
            if (existingUsers && Array.isArray(existingUsers)) {
                const newUsersPath = path.join(cwd, 'data', 'users.json');
                if (fs.existsSync(newUsersPath)) {
                    const newUsers = JSON.parse(fs.readFileSync(newUsersPath, 'utf-8'));
                    const mergedUsers = newUsers.map((nu: any) => {
                        const oldUser = existingUsers.find((ou: any) => ou.id === nu.id || ou.email === nu.email);
                        if (oldUser && oldUser.notificationSettings) {
                            nu.notificationSettings = oldUser.notificationSettings;
                        }
                        return nu;
                    });
                    fs.writeFileSync(newUsersPath, JSON.stringify(mergedUsers, null, 2));
                }
            }
        } catch(e) { console.error('Erro restaurando notfs', e) }
        // ------------------------------------
        
        try { fs.unlinkSync(finalZipPath); } catch(e) {}

        // O zip foi extraído direto no disco, sem passar por writeCollection.
        // Sem descartar o cache, o servidor continuaria servindo os dados antigos.
        storage.invalidateCache();

        console.log(`Backup (dados e imagens) importado com sucesso! ${extractedCount} arquivos extraidos.`);
        return res.json({ ok: true, complete: true });
      }
      
      res.json({ ok: true, complete: false });
    } catch (error: any) {
      console.error("Erro no chunk do backup:", error);
      res.status(500).json({ error: "Erro no chunk: " + (error.message || error) });
    }
  });

  app.post("/api/backup/import", authenticateToken, upload.single('file'), async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') return res.status(403).send("Acesso negado");

    const file = (req as any).file;
    if (!file) return res.status(400).send("Arquivo não enviado");

    try {
      console.log('Importing backup from:', file.path, 'size:', file.size, 'type:', file.mimetype);
      const zip = new AdmZip(file.path);
      const cwd = process.cwd();
      
      // --- PRESERVE NOTIFICATIONS & USERS ---
      let existingPushSubscriptions = null;
      let existingUsers = null;
      try {
          const pushPath = path.join(cwd, 'data', 'push_subscriptions.json');
          if (fs.existsSync(pushPath)) {
              existingPushSubscriptions = fs.readFileSync(pushPath, 'utf-8');
          }
          const usersPath = path.join(cwd, 'data', 'users.json');
          if (fs.existsSync(usersPath)) {
              existingUsers = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
          }
      } catch(e) { console.error('Erro lendo config previa', e) }
      // ------------------------------------

      const entries = zip.getEntries();
      let extractedCount = 0;
      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            zip.extractEntryTo(entry, cwd, true, true);
            extractedCount++;
          }
        } catch (innerErr: any) {
          console.error(`Erro ao extrair ${entry.entryName}:`, innerErr);
        }
      }
      
      // --- RESTORE NOTIFICATIONS & USERS ---
      try {
          if (existingPushSubscriptions) {
              fs.writeFileSync(path.join(cwd, 'data', 'push_subscriptions.json'), existingPushSubscriptions);
          }
          if (existingUsers && Array.isArray(existingUsers)) {
              const newUsersPath = path.join(cwd, 'data', 'users.json');
              if (fs.existsSync(newUsersPath)) {
                  const newUsers = JSON.parse(fs.readFileSync(newUsersPath, 'utf-8'));
                  const mergedUsers = newUsers.map((nu: any) => {
                      const oldUser = existingUsers.find((ou: any) => ou.id === nu.id || ou.email === nu.email);
                      if (oldUser && oldUser.notificationSettings) {
                          nu.notificationSettings = oldUser.notificationSettings;
                      }
                      return nu;
                  });
                  fs.writeFileSync(newUsersPath, JSON.stringify(mergedUsers, null, 2));
              }
          }
      } catch(e) { console.error('Erro restaurando notfs', e) }
      // ------------------------------------
      
      try { fs.unlinkSync(file.path); } catch (e) {}

      // Mesmo motivo do endpoint em partes: a extração escreveu os arquivos
      // por fora do writeCollection, então o cache em memória está velho.
      storage.invalidateCache();

      console.log(`Backup (dados e imagens) importado com sucesso! ${extractedCount} arquivos extraidos.`);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Erro ao processar backup:", error);
      res.status(500).json({ error: "Erro ao processar arquivo de backup: " + (error.message || error), details: error.stack });
    }
  });

  // --- Verse of the Day API ---
  app.get("/api/verses/today", async (req, res) => {
    try {
      const verse = await getDailyVerse();
      if (!verse) return res.status(404).json({ error: "Nenhum versículo cadastrado" });
      res.json(verse);
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar versículo do dia" });
    }
  });

  app.post("/api/verses/refresh", authenticateToken, async (req, res) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

      let history = await storage.readCollection<any>("verseHistory") || [];
      
      for (const entry of history) {
          if (entry.date === todayStr || entry.date === tomorrowStr) {
              await storage.remove("verseHistory", entry.id);
          }
      }

      // Now get new ones
      const todayVerse = await getDailyVerse(todayStr);
      const tomorrowVerse = await getDailyVerse(tomorrowStr);

      res.json({ success: true, today: todayVerse, tomorrow: tomorrowVerse });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar versículos" });
    }
  });

  app.get("/api/verses/stats", authenticateToken, async (req, res) => {
    try {
      const verses = await storage.readCollection<any>("verses");
      if (verses.length === 0) {
        return res.json({ total: 0, today: null, tomorrow: null });
      }
      
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

      const todayVerse = await getDailyVerse(todayStr);
      const tomorrowVerse = await getDailyVerse(tomorrowStr);

      res.json({
        total: verses.length,
        today: todayVerse,
        tomorrow: tomorrowVerse
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar estatísticas de versículos" });
    }
  });

  // =========================================================================
  // POLÍTICA DE LEITURA DAS COLEÇÕES
  //
  // Antes, qualquer membro logado conseguia ler qualquer coleção por inteiro:
  // telefones e endereços de toda a igreja, lançamentos financeiros, visitas
  // pastorais, pedidos de oração privados e o token do Telegram guardado em
  // `config`. Só a senha era removida.
  //
  // Aqui a regra é definida coleção por coleção. Coleção sem regra = negada,
  // então ao criar uma nova você precisa adicioná-la aqui.
  // =========================================================================

  const isAdminRole = (u: any) => u?.role === 'admin' || u?.role === 'superadmin';
  const isLeaderRole = (u: any) => u?.role === 'leader';

  type ReadScope =
    | 'all'            // qualquer membro logado
    | 'own'            // só os próprios registros (admin vê tudo)
    | 'adminOrLeader'  // admin e líder veem tudo; membro vê os próprios
    | 'admin';         // só administradores

  const READ_POLICY: Record<string, ReadScope> = {
    // Conteúdo aberto a toda a igreja
    events: 'all',
    announcements: 'all',
    sermons: 'all',
    readingPlans: 'all',
    ministries: 'all',
    ministrySchedules: 'all',
    cells: 'all',
    verses: 'all',
    verseHistory: 'all',
    users: 'all',              // campos sensíveis removidos abaixo
    config: 'all',             // credenciais removidas abaixo
    prayers: 'all',            // pedidos privados de terceiros removidos abaixo
    eventRegistrations: 'all', // contatos de terceiros removidos abaixo

    // Apenas os próprios registros
    verseHighlights: 'own',
    userProgress: 'own',
    titheTransactions: 'own',

    // Líderes acompanham; membro vê só o que diz respeito a ele
    pastoralVisits: 'adminOrLeader',
    serviceReports: 'adminOrLeader',
    attendance: 'adminOrLeader',

    // Administrativo e financeiro
    adminRoles: 'admin',
    transactions: 'admin',
    funds: 'admin',
    financialRules: 'admin',
    inventory: 'admin',
  };

  /**
   * Verdadeiro se o registro pertence ao usuário. Cobre os vários formatos
   * usados no projeto (`uid`, `userId`) e também listas de participantes —
   * a chamada de célula (`attendance`), por exemplo, não tem dono único:
   * o membro aparece dentro de `presentMembers` / `absentMembers`.
   */
  const ownsRecord = (item: any, userId: string): boolean =>
    item?.uid === userId ||
    item?.userId === userId ||
    item?.memberId === userId ||
    item?.id === userId ||
    (Array.isArray(item?.presentMembers) && item.presentMembers.includes(userId)) ||
    (Array.isArray(item?.absentMembers) && item.absentMembers.includes(userId)) ||
    (Array.isArray(item?.memberIds) && item.memberIds.includes(userId));

  // Campos de `users` visíveis só para administradores e para o próprio dono.
  // `birthDate` fica fora da lista de propósito: a tela "Aniversariantes"
  // depende dele para funcionar.
  const USER_PRIVATE_FIELDS = [
    'email', 'phone', 'address', 'cpf', 'rg',
    'integrationNotes', 'notificationSettings', 'pushSubscriptions',
    'mustChangePassword', 'memberStatus',
  ];

  // Documentos de `config` que guardam credenciais de integração
  const CONFIG_ADMIN_ONLY_IDS = ['cloudBackup', 'whatsapp'];
  const SECRET_KEY_PATTERN = /token|secret|senha|password|apikey|api_key|privatekey|private_key|webhook/i;

  function filterCollectionForUser(name: string, data: any[], user: any): any[] {
    const admin = isAdminRole(user);
    const leader = isLeaderRole(user);

    if (name === 'users') {
      return data.map((u: any) => {
        const safe = { ...u };
        delete safe.password; // nunca sai, nem para administrador
        if (admin || u.id === user.id) return safe;
        for (const field of USER_PRIVATE_FIELDS) delete safe[field];
        return safe;
      });
    }

    if (name === 'config') {
      if (admin) return data;
      return data
        .filter((c: any) => !CONFIG_ADMIN_ONLY_IDS.includes(c?.id))
        .map((c: any) => {
          const safe: any = {};
          for (const [key, value] of Object.entries(c || {})) {
            if (!SECRET_KEY_PATTERN.test(key)) safe[key] = value;
          }
          return safe;
        });
    }

    if (name === 'prayers') {
      if (admin) return data;
      return data.filter((p: any) => p?.privacy !== 'private' || ownsRecord(p, user.id));
    }

    if (name === 'eventRegistrations') {
      if (admin) return data;
      return data.map((r: any) => {
        if (ownsRecord(r, user.id)) return r;
        const safe = { ...r };
        delete safe.userPhone;
        delete safe.userEmail;
        return safe;
      });
    }

    if (name === 'attendance' && !admin && !leader) {
      // O membro vê que esteve presente, mas não as anotações do líder
      return data.map((a: any) => {
        const safe = { ...a };
        delete safe.notes;
        return safe;
      });
    }

    return data;
  }

  app.get("/api/collections/:name", authenticateToken, async (req: any, res) => {
    const name = req.params.name;
    const user = req.user;
    const scope = READ_POLICY[name];

    if (!scope) {
      console.warn(`[Auth] Leitura negada: "${name}" não tem regra em READ_POLICY`);
      return res.status(403).json({ error: "Coleção não disponível." });
    }

    const admin = isAdminRole(user);

    if (scope === 'admin' && !admin) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }

    try {
      let data = await storage.readCollection<any>(name);

      const restrictToOwn =
        (scope === 'own' && !admin) ||
        (scope === 'adminOrLeader' && !admin && !isLeaderRole(user));

      if (restrictToOwn) {
        data = data.filter((item: any) => ownsRecord(item, user.id));
      }

      res.json(filterCollectionForUser(name, data, user));
    } catch (error) {
      console.error(`Erro ao ler coleção ${name}:`, error);
      res.status(500).json({ error: "Erro ao buscar dados" });
    }
  });

  app.post("/api/ministries/:id/notes", authenticateToken, async (req: any, res) => {
    try {
      const { content, type, attachments } = req.body;
      const ministryId = req.params.id;
      
      const ministry = await storage.findById("ministries", ministryId) as any;
      const users = await storage.readCollection<any>("users");
      
      if (!ministry) return res.status(404).json({ error: "Ministério não encontrado" });
      
      const newNote = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          content,
          type: type || 'text',
          attachments,
          authorId: req.user.id,
          createdAt: new Date().toISOString()
      };
      
      const currentNotes = ministry.notes || [];
      ministry.notes = [...currentNotes, newNote];
      await storage.update("ministries", ministryId, ministry);
      
      const allTargetIds = new Set([...(ministry.memberIds || []), ...(ministry.leaderIds || [])]);
      // Remove author from receiving push/whatsapp for their own note
      allTargetIds.delete(req.user.id);
      const targetUserIds = Array.from(allTargetIds);
      
      // Push Notification
      const pushTitle = `🗒️ Nota: ${ministry.name}`;
      const pushBody = content.length > 50 ? content.substring(0, 50) + "..." : content;
      sendPushNotification(pushTitle, pushBody, '/', targetUserIds).catch(err => console.error("Push failed:", err));
      
      // WhatsApp Notifications
      if (whatsappClient && whatsappStatus === 'READY') {
          const author = users.find(u => u.id === req.user.id);
          const authorName = author ? author.name : 'Líder';
          const waMessage = `📢 *Novo aviso do ministério ${ministry.name}*\n\n${content}\n\n_Enviado por: ${authorName}_`;
          
          for (const uid of targetUserIds) {
              const u = users.find(u => u.id === uid);
              if (u && u.phone && String(u.phone).trim()) {
                 const chatId = await getWhatsAppChatId(u.phone);
                 if (chatId) {
                     await whatsappClient.sendMessage(chatId, waMessage).catch(() => {});
                     await new Promise(r => setTimeout(r, 100)); // anti-spam delay
                 }
              }
          }
      }
      
      res.json(newNote);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao adicionar anotação" });
    }
  });

  app.post("/api/public/prayers", async (req, res) => {
    try {
      const newItem = {
        ...req.body,
        id: Math.random().toString(36).substr(2, 9),
        uid: 'public',
        date: new Date().toLocaleDateString('pt-BR'),
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString()
      };
      
      await storage.insert('prayers', newItem);
      console.log(`Successfully inserted into prayers (public):`, newItem.id);
      
      const privacy = newItem.privacy === 'private' ? 'Privado' : 'Público';
      const msg = `🙏 *Novo Pedido de Oração (Público)*\n\n*Nome:* ${newItem.user || 'Anônimo'}\n*Privacidade:* ${privacy}\n*Mensagem:* ${newItem.content}`;
      sendWhatsAppNotifications(msg).catch(e => console.error("WhatsApp notification failed:", e));
      
      res.json(newItem);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao adicionar oração pública" });
    }
  });

  app.post("/api/collections/:name/batch", authenticateToken, async (req: any, res) => {
    try {
      const requester = req.user;
      
      // Protect batch creations
      if (req.params.name === 'users' && requester.role !== 'admin' && requester.role !== 'superadmin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const items = req.body.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "O atributo 'items' deve ser um array." });
      }
      
      const newItems = items.map(item => ({
        ...item,
        id: item.id || uuidv4(),
        createdAt: item.createdAt || new Date().toISOString()
      }));
      
      const existing = await storage.readCollection(req.params.name) || [];
      const updated = [...existing, ...newItems];
      await storage.writeCollection(req.params.name, updated);
      
      res.json({ success: true, count: newItems.length });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar em massa" });
    }
  });

  app.post("/api/collections/prayers/:id/toggle", authenticateToken, async (req: any, res) => {
    try {
      const requester = req.user;
      const prayerId = req.params.id;
      const prayer = await storage.findById<any>('prayers', prayerId);
      
      if (!prayer) {
        return res.status(404).json({ error: "Pedido de oração não encontrado" });
      }

      const prayedBy = prayer.prayedBy || [];
      const isPraying = prayedBy.includes(requester.id);
      const newPrayedBy = isPraying ? prayedBy.filter((id: string) => id !== requester.id) : [...prayedBy, requester.id];
      const newLikes = isPraying ? Math.max(0, (prayer.likes || 0) - 1) : (prayer.likes || 0) + 1;

      const updated = await storage.update('prayers', prayerId, {
        prayedBy: newPrayedBy,
        likes: newLikes
      });

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar oração" });
    }
  });

  app.post("/api/collections/:name", authenticateToken, async (req: any, res) => {
    try {
      const requester = req.user;
      const restrictedCollections = ['users', 'ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles', 'inventory'];
      
      if (restrictedCollections.includes(req.params.name) && requester.role !== 'admin' && requester.role !== 'superadmin') {
        return res.status(403).json({ error: "Você não tem permissão para adicionar nesta coleção." });
      }

      const newItem = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      
      // Stop users from spoofing UID
      if (['prayers', 'eventRegistrations', 'pastoralVisits', 'userProgress', 'verseHighlights'].includes(req.params.name)) {
        if (newItem.uid && newItem.uid !== requester.id) {
          if (requester.role !== 'admin' && requester.role !== 'superadmin') {
             newItem.uid = requester.id;
          }
        }
      }

      await storage.insert(req.params.name, newItem);
      console.log(`Successfully inserted into ${req.params.name}:`, newItem.id);
      
      // WhatsApp Notification Trigger
      if (req.params.name === 'prayers') {
        const privacy = newItem.privacy === 'private' ? 'Privado' : 'Público';
        const msg = `🙏 *Novo Pedido de Oração*\n\n*Membro:* ${(req as any).user.name || 'Desconhecido'}\n*Privacidade:* ${privacy}\n*Mensagem:* ${newItem.content}`;
        sendWhatsAppNotifications(msg).catch(e => console.error("WhatsApp notification failed:", e));
        sendPushNotification("Novo Pedido de Oração", `${(req as any).user.name || 'Alguém'} pediu oração: ${newItem.content.substring(0, 50)}...`, '/').catch(e => console.error("Push failed:", e));
      } else if (req.params.name === 'pastoralVisits') {
        const msg = `🏡 *Nova Visita Pastoral*\n\n*Solicitante:* ${(req as any).user.name || 'Desconhecido'}\n*Motivo:* ${newItem.reason || 'Não informado'}`;
        sendWhatsAppNotifications(msg).catch(e => console.error("WhatsApp notification failed:", e));
      } else if (req.params.name === 'events') {
        sendPushNotification("📅 Novo Evento!", `Participe: ${newItem.title}`, '/').catch(e => console.error("Push failed:", e));
      } else if (req.params.name === 'announcements') {
        sendPushNotification("📢 Comunicado", newItem.title, '/').catch(e => console.error("Push failed:", e));
      } else if (req.params.name === 'eventRegistrations') {
        const event = await storage.findById<any>('events', newItem.eventId);
        const msg = `🎟️ *Nova Inscrição em Evento*\n\n*Evento:* ${event?.title || 'Desconhecido'}\n*Membro:* ${newItem.userName}\n*Contato:* ${newItem.userPhone || newItem.userEmail}\n*Status:* Pendente`;
        sendWhatsAppNotifications(msg).catch(e => console.error("WhatsApp notification failed:", e));
      }
      
      res.json(newItem);
    } catch (error) {
      console.error(`Error saving to ${req.params.name}:`, error);
      res.status(500).json({ error: "Erro ao salvar: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.patch("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
      // Role Validation for Users collection
      if (req.params.name === 'users') {
        const targetId = req.params.id;
        const requester = (req as any).user;
        const updates = req.body;

        // Prevent updating passwords directly via PATCH
        if ('password' in updates) {
          delete updates.password;
        }

        // Only admins, superadmins, or the user themselves can update their profile
        if (targetId !== requester.id && requester.role !== 'admin' && requester.role !== 'superadmin') {
          return res.status(403).json({ error: "Você não tem permissão para atualizar o perfil de outro usuário" });
        }

        if (updates.role) {
          // Only superadmin can set someone as admin
          if (updates.role === 'admin' && requester.role !== 'superadmin') {
            return res.status(403).json({ error: "Apenas o Super Admin pode promover usuários a Administrador" });
          }
          
          // Only admin or superadmin can change roles
          if (requester.role !== 'superadmin' && requester.role !== 'admin') {
            return res.status(403).json({ error: "Você não tem permissão para alterar funções" });
          }

          // No one can change their own role to prevent self-promotion accidents/security bypass
          if (targetId === requester.id && updates.role !== requester.role) {
             return res.status(403).json({ error: "Você não pode alterar sua própria função" });
          }
        }
      } else {
         const requester = (req as any).user;
         const restrictedCollections = ['ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles', 'inventory'];
         
         if (restrictedCollections.includes(req.params.name) && requester.role !== 'admin' && requester.role !== 'superadmin') {
           // Permitir que membros solicitem entrada (patch no campo pendingRequestIds)
           if (req.params.name === 'ministries' && (req.method === 'PATCH' || req.method === 'PUT')) {
             const updates = Object.keys(req.body);
             const ministry = await storage.findById<any>("ministries", req.params.id);
             const isLeader = ministry && ministry.leaderIds && ministry.leaderIds.includes(requester.id);

             if (updates.length === 1 && updates[0] === 'pendingRequestIds') {
               // OK - permitimos apenas este campo para solicitação de entrada
             } else if (isLeader) {
               const allowed = ['memberIds', 'pendingRequestIds', 'notes', 'memberRoles', 'ministryTools'];
               const isDisallowed = updates.some(k => !allowed.includes(k));
               if (isDisallowed) {
                 return res.status(403).json({ error: "Você não tem permissão para editar estes campos." });
               }
             } else {
               return res.status(403).json({ error: "Você não tem permissão para editar itens desta coleção." });
             }
           } else if (req.params.name === 'cells' && (req.method === 'PATCH' || req.method === 'PUT')) {
             const updates = Object.keys(req.body);
             const cell = await storage.findById<any>("cells", req.params.id);
             const isLeader = cell && cell.leaderId === requester.id;

             if (updates.length <= 2 && updates.every(k => ['membersList', 'members', 'pendingRequestIds'].includes(k))) {
               // OK - members can request to join or join directly
             } else if (isLeader) {
               const allowed = ['membersList', 'pendingRequestIds', 'nextMeeting', 'address', 'time'];
               const isDisallowed = updates.some(k => !allowed.includes(k));
               if (isDisallowed) {
                 return res.status(403).json({ error: "Você não tem permissão para editar estes campos." });
               }
             } else {
               return res.status(403).json({ error: "Você não tem permissão para editar itens desta coleção." });
             }
           } else {
             return res.status(403).json({ error: "Você não tem permissão para editar itens desta coleção." });
           }
         }
         
         if (['prayers', 'eventRegistrations', 'pastoralVisits', 'userProgress', 'verseHighlights'].includes(req.params.name)) {
           if (requester.role !== 'admin' && requester.role !== 'superadmin') {
             const item = await storage.findById<any>(req.params.name, req.params.id);
             if (item && item.uid && item.uid !== requester.id) {
               if (req.params.name === 'prayers') {
                 const updates = Object.keys(req.body);
                 const allowed = ['prayedBy', 'likes', 'comments', 'commentsList'];
                 const isDisallowed = updates.some(k => !allowed.includes(k));
                 if (isDisallowed) {
                   return res.status(403).json({ error: "Você não tem permissão para editar estes campos." });
                 }
               } else if (req.params.name === 'pastoralVisits' && requester.role === 'leader') {
                 const updates = Object.keys(req.body);
                 const allowed = ['status'];
                 const isDisallowed = updates.some(k => !allowed.includes(k));
                 if (isDisallowed) {
                   return res.status(403).json({ error: "Líderes só podem atualizar o status da visita." });
                 }
               } else {
                 return res.status(403).json({ error: "Você não tem permissão para editar este item." });
               }
             }
           }
         }
      }

      const updated = await storage.update(req.params.name, req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Não encontrado" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar" });
    }
  });

  app.delete("/api/collections/:name/:id", authenticateToken, async (req: any, res) => {
    try {
      const requester = req.user;
      const restrictedCollections = ['users', 'ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles', 'inventory'];
      
      if (restrictedCollections.includes(req.params.name) && requester.role !== 'admin' && requester.role !== 'superadmin') {
        return res.status(403).json({ error: "Você não tem permissão para excluir itens desta coleção." });
      }

      // Check ownership for user collections if they are not admin
      if (['prayers', 'eventRegistrations', 'pastoralVisits', 'userProgress', 'verseHighlights'].includes(req.params.name)) {
        if (requester.role !== 'admin' && requester.role !== 'superadmin') {
          const item = await storage.findById<any>(req.params.name, req.params.id);
          if (item && item.uid !== requester.id) {
            return res.status(403).json({ error: "Você não tem permissão para excluir este item." });
          }
        }
      }

      const deleted = await storage.remove(req.params.name, req.params.id);
      if (!deleted) return res.status(404).json({ error: "Não encontrado" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar" });
    }
  });

  // --- WhatsApp API Endpoints ---
  app.get("/api/whatsapp/status", authenticateToken, (req, res) => {
    res.json({ 
      status: whatsappStatus,
      hasQr: !!lastQr,
      qr: lastQr,
      error: whatsappError
    });
  });

  app.post("/api/whatsapp/reconnect", authenticateToken, async (req, res) => {
    await initWhatsApp();
    res.json({ status: 'Initiated' });
  });

  let activeUploads: { [key: string]: { path: string, originalName: string } } = {};

  app.post("/api/upload-chunk", authenticateToken, upload.single('chunk'), (req: any, res) => {
    try {
      const { chunkIndex, totalChunks, uploadId, fileName } = req.body;
      if (!req.file) return res.status(400).json({ error: "Chunk não enviado" });
      
      const tempDir = path.join(process.cwd(), 'temp_uploads');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      
      const chunkFile = path.join(tempDir, `${uploadId}`);
      const chunkBuffer = fs.readFileSync(req.file.path);
      fs.appendFileSync(chunkFile, chunkBuffer);
      
      try { fs.unlinkSync(req.file.path); } catch(e) {}
      
      if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
        // Ultimo chunk
        const ext = path.extname(fileName) || '';
        const finalName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const finalPath = path.join(process.cwd(), 'uploads', finalName);
        fs.renameSync(chunkFile, finalPath);
        return res.json({ complete: true, url: `/uploads/${finalName}` });
      }
      
      res.json({ complete: false });
    } catch (error) {
      console.error("Erro no chunk do upload:", error);
      res.status(500).json({ error: "Erro no chunk" });
    }
  });

  app.post("/api/upload", authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      res.json({ url: `/uploads/${req.file.filename}` });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Erro no upload" });
    }
  });

  app.post("/api/whatsapp/logout", authenticateToken, async (req, res) => {
    if (whatsappClient) {
      try {
        await whatsappClient.logout();
        whatsappStatus = 'DISCONNECTED';
        lastQr = null;
        
        // Clear CRM data on logout as requested
        await storage.writeCollection('crmTickets', []);
        await storage.writeCollection('crmMessages', []);

        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Erro ao deslogar' });
      }
    } else {
      res.status(400).json({ error: 'Cliente não iniciado' });
    }
  });

  app.post("/api/whatsapp/send", authenticateToken, async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
      
      const chatId = await getWhatsAppChatId(to);
      if (!whatsappClient || whatsappStatus !== 'READY') {
          return res.status(503).json({ error: 'WhatsApp não está conectado' });
      }
      if (!chatId) return res.status(400).json({ error: 'Telefone inválido' });
      await whatsappClient.sendMessage(chatId, message);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao enviar: " + (error instanceof Error ? error.message : "Erro desconhecido") });
    }
  });

  app.post("/api/whatsapp/test", authenticateToken, async (req, res) => {
    try {
      await sendWhatsAppNotifications("✅ *Teste de Conexão WhatsApp*\nSeu sistema de notificações está funcionando perfeitamente!");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao enviar teste: " + (error instanceof Error ? error.message : "Erro desconhecido") });
    }
  });

  // --- Consolidation API Endpoints ---
  app.get("/api/whatsapp/consolidation/templates", authenticateToken, async (req, res) => {
    try {
      const templates = await storage.readCollection('consolidationTemplates');
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar templates" });
    }
  });

  app.post("/api/whatsapp/consolidation/templates", authenticateToken, async (req, res) => {
    try {
      const data = { id: uuidv4(), ...req.body };
      const newTemplate = await storage.insert('consolidationTemplates', data);
      res.json(newTemplate);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar template" });
    }
  });

  app.put("/api/whatsapp/consolidation/templates/:id", authenticateToken, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      const templates = await storage.readCollection<any>('consolidationTemplates');
      const index = templates.findIndex(t => t.id === id);
      if (index === -1) return res.status(404).json({ error: "Template não encontrado" });
      
      templates[index] = { ...templates[index], ...updates };
      await storage.writeCollection('consolidationTemplates', templates);
      res.json(templates[index]);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar template" });
    }
  });

  app.delete("/api/whatsapp/consolidation/templates/:id", authenticateToken, async (req, res) => {
    try {
      const id = req.params.id;
      const templates = await storage.readCollection<any>('consolidationTemplates');
      const filtered = templates.filter(t => t.id !== id);
      await storage.writeCollection('consolidationTemplates', filtered);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar template" });
    }
  });

  app.post("/api/whatsapp/consolidation/trigger", authenticateToken, async (req, res) => {
    try {
      if (!whatsappClient || whatsappStatus !== 'READY') return res.status(503).json({ error: 'WhatsApp offline' });
      
      const templates = await storage.readCollection<any>('consolidationTemplates');
      if (!templates || templates.length === 0) return res.status(400).json({ error: 'Nenhum template cadastrado' });

      // Build upcoming events (next 7 days)
      const events = await storage.readCollection<any>('events');
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      
      const upcomingEvents = events.filter(e => {
        if (!e.date) return false;
        
        let evDate;
        if (e.date.includes('-')) {
            const [y, m, d] = e.date.split('-');
            evDate = new Date(Number(y), Number(m) - 1, Number(d));
        } else {
            evDate = new Date(e.date);
        }
        
        return evDate.getTime() >= now.getTime() && evDate.getTime() <= nextWeek.getTime();
      });
      
      if (upcomingEvents.length === 0) {
        return res.json({ sent: 0, message: "Nenhum evento nos próximos 7 dias para convidar." });
      }
      
      const users = await storage.readCollection<any>('users');
      const targetUsers = users.filter(u => {
        if (!u.phone) return false;
        const isVisitorOrNew = u.memberStatus === 'visitor' || u.memberStatus === 'new_member';
        if (isVisitorOrNew) {
           return !u.consolidationOptOut;
        } else {
           return !!u.forceConsolidation;
        }
      });

      if (targetUsers.length === 0) {
        return res.json({ sent: 0, message: "Nenhum membro se qualifica para receber os convites. Verifique se há visitantes/novos membros com telefone e permissão ativada ou outro membro forçado a receber na edição de usuários." });
      }

      let sentCount = 0;
      let failedSends = 0;
      
      // Build Agenda Text
      let agendaText = "📅 *Agenda da Semana*\n\n";
      for (const event of upcomingEvents) {
          const evDateObj = event.date.includes('-') 
              ? new Date(Number(event.date.split('-')[0]), Number(event.date.split('-')[1]) - 1, Number(event.date.split('-')[2])) 
              : new Date(event.date);
          const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          const diaNome = diasSemana[evDateObj.getDay()];
          const isSpecial = event.frequency === 'special' || event.frequency === 'one_time';
          const icon = isSpecial ? '🌟' : '📍';
          agendaText += `${icon} *${event.title}*\n🗓️ ${diaNome}, ${evDateObj.toLocaleDateString('pt-BR')} às ${event.time}\n`;
          if (event.location) agendaText += `🏢 Local: ${event.location}\n`;
          agendaText += `\n`;
      }
      
      // Find special events happening exactly 2 days from now
      const in2Days = new Date(now);
      in2Days.setDate(in2Days.getDate() + 2);
      const specialEventsIn2Days = upcomingEvents.filter(e => {
          if (e.frequency === 'weekly') return false; // Only special/one_time
          const evDateObj = e.date.includes('-') 
              ? new Date(Number(e.date.split('-')[0]), Number(e.date.split('-')[1]) - 1, Number(e.date.split('-')[2])) 
              : new Date(e.date);
          // Check if event is on the day 2 days from now
          return evDateObj.getDate() === in2Days.getDate() && evDateObj.getMonth() === in2Days.getMonth() && evDateObj.getFullYear() === in2Days.getFullYear();
      });

      for (const user of targetUsers) {
           let clean = user.phone.replace(/\D/g, '');
           if (!clean.startsWith('55')) clean = '55' + clean;
           
           let primaryId = `${clean}@c.us`;
           let alternativeId: string | null = null;
           
           if (clean.length === 12) {
               alternativeId = `${clean.substring(0, 4)}9${clean.substring(4)}@c.us`;
           } else if (clean.length === 13) {
               alternativeId = `${clean.substring(0, 4)}${clean.substring(5)}@c.us`;
           }

           const trySend = async (chatId: string, content: any, type: 'text'|'media' = 'text', caption?: string) => {
               if (type === 'media') {
                   await whatsappClient.sendMessage(chatId, content, { caption });
               } else {
                   await whatsappClient.sendMessage(chatId, content);
               }
           };

           try {
               let successChatId = primaryId;
               try {
                   // Send Agenda
                   let helloMessage = `Olá *${user.name}*, tudo bem? Confira o que vai rolar na nossa igreja nos próximos 7 dias:\n\n` + agendaText;
                   await trySend(primaryId, helloMessage, 'text');
               } catch (e1) {
                   if (alternativeId) {
                       successChatId = alternativeId;
                       let helloMessage = `Olá *${user.name}*, tudo bem? Confira o que vai rolar na nossa igreja nos próximos 7 dias:\n\n` + agendaText;
                       await trySend(alternativeId, helloMessage, 'text');
                   } else {
                       throw e1;
                   }
               }
               
               // If there are special events in 2 days, send them right after the agenda
               for (const spEvent of specialEventsIn2Days) {
                   let tmpl = templates.find(t => t.eventType === spEvent.category) || templates.find(t => t.eventType === 'all');
                   if (!tmpl) continue;

                   let messageText = tmpl.message;
                   messageText = messageText.replace(/\{nome\}/g, user.name);
                   messageText = messageText.replace(/\{evento\}/g, spEvent.title);
                   const evDateObj = spEvent.date.includes('-') 
                        ? new Date(Number(spEvent.date.split('-')[0]), Number(spEvent.date.split('-')[1]) - 1, Number(spEvent.date.split('-')[2])) 
                        : new Date(spEvent.date);
                   if (spEvent.time) evDateObj.setHours(Number(spEvent.time.split(':')[0]), Number(spEvent.time.split(':')[1]));
                   messageText = messageText.replace(/\{data\}/g, evDateObj.toLocaleString('pt-BR'));
                   
                   let hasSentImage = false;
                   if (spEvent.image && spEvent.image.startsWith('http')) {
                       try {
                           const media = await MessageMedia.fromUrl(spEvent.image);
                           await trySend(successChatId, media, 'media', messageText);
                           hasSentImage = true;
                       } catch (imgErr) {
                           console.error(`Erro ao baixar imagem:`, imgErr);
                       }
                   }
                   if (!hasSentImage) {
                       await trySend(successChatId, messageText, 'text');
                   }
               }

               // Send text at the end instead of Poll
               await trySend(successChatId, '⚠️ Responda *1* a qualquer momento se quiser parar de receber nossa agenda e convites automáticos.', 'text');

               sentCount++;
               await new Promise(r => setTimeout(r, 2000));
           } catch(e) {
               console.error(`Falha ao enviar para ${user.name}:`, e);
               failedSends++;
           }
      }

      res.json({ sent: sentCount, message: `Disparos concluídos. ${sentCount} membros comunicados. Detalhes: Agenda de ${upcomingEvents.length} eventos enviada; ${specialEventsIn2Days.length} eventos especiais pontuais notificados. Falhas: ${failedSends}.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao disparar convites", details: error instanceof Error ? error.message : "Desconhecido" });
    }
  });

  // --- CRM API Endpoints ---
  app.get("/api/whatsapp/crm/tickets", authenticateToken, async (req, res) => {
    try {
      const tickets = await storage.readCollection('crmTickets');
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tickets" });
    }
  });

  app.get("/api/whatsapp/crm/tickets/:id/messages", authenticateToken, async (req, res) => {
    try {
      const messages = await storage.readCollection('crmMessages');
      const ticketMessages = messages.filter((m: any) => m.ticketId === req.params.id);
      res.json(ticketMessages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  app.post("/api/whatsapp/crm/tickets/:id/send", authenticateToken, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const { text, isPoll, pollOptions } = req.body;
      const authorId = (req as any).user?.id;

      if (!whatsappClient || whatsappStatus !== 'READY') return res.status(503).json({ error: 'WhatsApp offline' });

      let msgRes;
      if (isPoll && pollOptions) {
        const poll = new Poll(text, pollOptions, { allowMultipleAnswers: false });
        msgRes = await whatsappClient.sendMessage(ticketId, poll);
      } else {
        msgRes = await whatsappClient.sendMessage(ticketId, text);
      }

      let tickets = await storage.readCollection<any>('crmTickets');
      let ticket = tickets.find((t: any) => t.id === ticketId);
      if (ticket) {
        ticket.updatedAt = new Date().toISOString();
        ticket.lastMessage = isPoll ? `[Enquete] ${text}` : text;
        ticket.status = 'open';
        await storage.update('crmTickets', ticket.id, ticket);
      }

      const newMsg = {
        id: msgRes?.id?._serialized || msgRes?.id?.id || require('crypto').randomUUID(),
        ticketId,
        text: isPoll ? `[Enquete] ${text}\n` + pollOptions.map((o: string) => `- ${o}`).join('\n') : text,
        fromMe: true,
        authorId,
        timestamp: new Date().toISOString()
      };
      await storage.insert('crmMessages', newMsg);

      res.json(newMsg);
    } catch (error) {
      console.error('Error sending CRM message:', error);
      res.status(500).json({ error: "Erro ao enviar mensagem: " + (error instanceof Error ? error.message : "Desconhecido") });
    }
  });

  app.put("/api/whatsapp/crm/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const updates = req.body;
      let tickets = await storage.readCollection<any>('crmTickets');
      let ticket = tickets.find((t: any) => t.id === ticketId);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });

      const updatedTicket = { ...ticket, ...updates, updatedAt: new Date().toISOString() };
      await storage.update('crmTickets', ticket.id, updatedTicket);
      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar ticket" });
    }
  });

  // --- Web Push Endpoints ---
  app.get("/api/push/public-key", (req, res) => {
    if (!vapidKeys) return res.status(503).json({ error: "VAPID keys not initialized" });
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/push/subscribe", authenticateToken, async (req, res) => {
    try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: "Subscription object is required" });
        }
        
        const subscriptions = await storage.readCollection<any>("push_subscriptions");
        const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
        
        if (!exists) {
            const sub = {
                id: uuidv4(),
                userId: (req as any).user.id,
                createdAt: new Date().toISOString(),
                ...subscription
            };
            await storage.insert("push_subscriptions", sub);
        }
        
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Error subscribing:", error);
        res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // --- Ministry Confirmation API ---
  app.post("/api/ministries/confirm", authenticateToken, async (req: any, res) => {
    try {
      const { scheduleId, status } = req.body; // status: 'confirmed' | 'declined'
      const userId = req.user.id;
      
      const schedules = await storage.readCollection<any>("ministrySchedules");
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) return res.status(404).json({ error: "Escala não encontrada" });
      
      const confirmations = schedule.confirmations || {};
      confirmations[userId] = status;
      
      await storage.update<any>("ministrySchedules", scheduleId, { confirmations });
      
      // Notify Ministry Leader
      const ministries = await storage.readCollection<any>("ministries");
      const ministry = ministries.find(m => m.id === schedule.ministryId);
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.id === userId);
      
      if (ministry && ministry.leaderIds && ministry.leaderIds.length > 0) {
        const leaders = users.filter(u => ministry.leaderIds.includes(u.id));
        const statusText = status === 'confirmed' ? 'CONFIRMOU' : 'DESMARCOU';
        const message = `🔔 *Notificação de Escala*\n\nO membro *${user?.name || 'Desconhecido'}* ${statusText} a presença para a escala:\n\n📅 Data: ${new Date(schedule.date).toLocaleDateString('pt-BR')}\n⏰ Hora: ${schedule.time}\n📝 Evento: ${schedule.title}`;
        
        for (const leader of leaders) {
          if (leader.phone) {
            const chatId = await getWhatsAppChatId(leader.phone);
            if (chatId) {
              await whatsappClient.sendMessage(chatId, message);
            }
          }
        }
      }
      
      res.json({ success: true, scheduleId, status });
    } catch (e) {
      console.error("Error confirming ministry schedule:", e);
      res.status(500).json({ error: "Erro ao processar confirmação" });
    }
  });

  // --- Vite / Static files ---
  if (process.env.NODE_ENV !== "production") {
    // Import dinâmico de propósito: o Vite é dependência de desenvolvimento.
    // Com `import` no topo do arquivo, o bundle de produção executaria
    // require("vite") na inicialização e o servidor quebraria numa instalação
    // feita com `npm ci --omit=dev`.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  await ensureMinistries();

  // Schedule Daily Verse
  cron.schedule('0 * * * *', async () => {
    try {
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:00`;

        const users = await storage.readCollection<any>("users");
        
        let targetUsers = users.filter((u: any) => 
            u.notificationSettings && 
            u.notificationSettings.wordOfDayEnabled && 
            !u.notificationSettings.allMuted && 
            u.notificationSettings.wordOfDayTime === currentTimeStr
        );
        
        // Also target users with no notification settings, only at 09:00
        if (currentTimeStr === '09:00') {
            const defaultUsers = users.filter((u: any) => 
                !u.notificationSettings || 
                (typeof u.notificationSettings.wordOfDayEnabled === 'undefined')
            );
            targetUsers = [...targetUsers, ...defaultUsers];
        }

        if (targetUsers.length > 0) {
            console.log(`Running daily verse notification for ${targetUsers.length} users at ${currentTimeStr}...`);
            const verse = await getDailyVerse();
            if (!verse) return;
            
            const targetIds = targetUsers.map((u: any) => u.id);
            await sendPushNotification("📖 Versículo do Dia", `"${verse.text}" - ${verse.ref}`, '/bible', targetIds);
        }
    } catch (e) {
        console.error('Failed to send daily verse notification:', e);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Automated trigger for Agenda and Special Events (runs every day at noon)
  cron.schedule('0 12 * * *', async () => {
    console.log('Running automated agenda and special events check...');
    try {
        if (!whatsappClient || whatsappStatus !== 'READY') return;
        
        const events = await storage.readCollection<any>('events');
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);
        
        const upcomingEvents = events.filter(e => {
            if (!e.date) return false;
            let evDate = e.date.includes('-') ? new Date(Number(e.date.split('-')[0]), Number(e.date.split('-')[1]) - 1, Number(e.date.split('-')[2])) : new Date(e.date);
            return evDate.getTime() >= now.getTime() && evDate.getTime() <= nextWeek.getTime();
        });
        
        const in2Days = new Date(now);
        in2Days.setDate(in2Days.getDate() + 2);
        const specialEventsIn2Days = upcomingEvents.filter(e => {
            if (e.frequency === 'weekly') return false; 
            const evDateObj = e.date.includes('-') ? new Date(Number(e.date.split('-')[0]), Number(e.date.split('-')[1]) - 1, Number(e.date.split('-')[2])) : new Date(e.date);
            return evDateObj.getDate() === in2Days.getDate() && evDateObj.getMonth() === in2Days.getMonth() && evDateObj.getFullYear() === in2Days.getFullYear();
        });

        // 1 is Monday
        const isMonday = new Date().getDay() === 1;
        
        if (!isMonday && specialEventsIn2Days.length === 0) return;

        const templates = await storage.readCollection<any>('consolidationTemplates');
        const users = await storage.readCollection<any>('users');
        const targetUsers = users.filter(u => {
            if (!u.phone) return false;
            const isVisitorOrNew = u.memberStatus === 'visitor' || u.memberStatus === 'new_member';
            return isVisitorOrNew ? !u.consolidationOptOut : !!u.forceConsolidation;
        });

        let agendaText = "📅 *Agenda da Semana*\n\n";
        for (const event of upcomingEvents) {
            const evDateObj = event.date.includes('-') ? new Date(Number(event.date.split('-')[0]), Number(event.date.split('-')[1]) - 1, Number(event.date.split('-')[2])) : new Date(event.date);
            const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const diaNome = diasSemana[evDateObj.getDay()];
            const isSpecial = event.frequency === 'special' || event.frequency === 'one_time';
            const icon = isSpecial ? '🌟' : '📍';
            agendaText += `${icon} *${event.title}*\n🗓️ ${diaNome}, ${evDateObj.toLocaleDateString('pt-BR')} às ${event.time}\n`;
            if (event.location) agendaText += `🏢 Local: ${event.location}\n`;
            agendaText += `\n`;
        }

        for (const user of targetUsers) {
            let clean = user.phone.replace(/\D/g, '');
            if (!clean.startsWith('55')) clean = '55' + clean;
            
            let primaryId = `${clean}@c.us`;
            let alternativeId: string | null = clean.length === 12 ? `${clean.substring(0, 4)}9${clean.substring(4)}@c.us` : (clean.length === 13 ? `${clean.substring(0, 4)}${clean.substring(5)}@c.us` : null);

            const trySend = async (chatId: string, content: any, type: 'text'|'media' = 'text', caption?: string) => {
                if (type === 'media') {
                    await whatsappClient.sendMessage(chatId, content, { caption });
                } else {
                    await whatsappClient.sendMessage(chatId, content);
                }
            };

            try {
                let successChatId = primaryId;
                let sentSomething = false;

                if (isMonday) {
                    try {
                        let helloMessage = `Olá *${user.name}*, tudo bem? Confira o que vai rolar na nossa igreja nos próximos 7 dias:\n\n` + agendaText;
                        await trySend(primaryId, helloMessage, 'text');
                        sentSomething = true;
                    } catch (e1) {
                        if (alternativeId) {
                            successChatId = alternativeId;
                            let helloMessage = `Olá *${user.name}*, tudo bem? Confira o que vai rolar na nossa igreja nos próximos 7 dias:\n\n` + agendaText;
                            await trySend(alternativeId, helloMessage, 'text');
                            sentSomething = true;
                        } else {
                            throw e1;
                        }
                    }
                }

                for (const spEvent of specialEventsIn2Days) {
                    let tmpl = templates.find(t => t.eventType === spEvent.category) || templates.find(t => t.eventType === 'all');
                    if (!tmpl) continue;

                    let messageText = tmpl.message;
                    messageText = messageText.replace(/\{nome\}/g, user.name);
                    messageText = messageText.replace(/\{evento\}/g, spEvent.title);
                    const evDateObj = spEvent.date.includes('-') ? new Date(Number(spEvent.date.split('-')[0]), Number(spEvent.date.split('-')[1]) - 1, Number(spEvent.date.split('-')[2])) : new Date(spEvent.date);
                    if (spEvent.time) evDateObj.setHours(Number(spEvent.time.split(':')[0]), Number(spEvent.time.split(':')[1]));
                    messageText = messageText.replace(/\{data\}/g, evDateObj.toLocaleString('pt-BR'));
                    
                    let hasSentImage = false;
                    if (spEvent.image && spEvent.image.startsWith('http')) {
                        try {
                            const media = await MessageMedia.fromUrl(spEvent.image);
                            await trySend(successChatId, media, 'media', messageText);
                            hasSentImage = true;
                            sentSomething = true;
                        } catch (imgErr) {
                            console.error(`Erro ao baixar imagem:`, imgErr);
                        }
                    }
                    if (!hasSentImage) {
                        try {
                             await trySend(successChatId, messageText, 'text');
                             sentSomething = true;
                        } catch(e) {
                             if (!isMonday && alternativeId && successChatId === primaryId) {
                                 successChatId = alternativeId;
                                 await trySend(successChatId, messageText, 'text');
                                 sentSomething = true;
                             }
                        }
                    }
                }

                if (sentSomething) {
                    await trySend(successChatId, '⚠️ Responda *1* a qualquer momento se quiser parar de receber nossa agenda e convites automáticos.', 'text');
                }

                await new Promise(r => setTimeout(r, 2000));
            } catch(e) {
                console.error(`Falha ao enviar evento diario para ${user.name}:`, e);
            }
        }
    } catch(err) {
        console.error('Failed to run automated agenda:', err);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL ERROR STARTING SERVER:", err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
