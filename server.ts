import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import os from "os";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as storage from "./src/lib/storage";
import { seedVerses } from "./src/lib/seedVerses";
import { fetchVerseText } from "./src/lib/bible";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
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
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storageConfig,
  limits: { fileSize: 200 * 1024 * 1024 } // Aumentado para 200MB para suportar imagens de altíssima resolução
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
                await storage.update("verses", selectedVerse.id, { text: fetchedText });
                
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
        const message = await getTodayBirthdaysMessage();
        if (message) {
            await sendWhatsAppNotifications(message);
            console.log('Daily birthday notification sent.');
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
        form.append('document', new Blob([fileBuffer]), `backup-automatico.zip`);

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

  app.use(cors());
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

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
        console.log("Criando Super Admin padrão...");
        const hashedPassword = await bcrypt.hash("admin", 10);
        const superAdmin = {
          id: uuidv4(),
          name: "Super Administrador",
          email: "admin",
          password: hashedPassword,
          role: "superadmin",
          createdAt: new Date().toISOString()
        };
        await storage.insert("users", superAdmin);
        console.log("Super Admin criado com sucesso (login: admin / senha: admin)");
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
        churchName: appearance?.churchName || null,
        churchInstagram: appearance?.churchInstagram || null,
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao carregar configurações públicas" });
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send('URL is required');
      
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error('Image proxy error:', err);
      res.status(500).send(`Error proxying image: ${err?.message || err}`);
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.id === userId);
      
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.update<any>("users", userId, { password: hashedPassword });
      
      res.json({ success: true });
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
  app.delete("/api/users/:userId/delete", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Acesso não autorizado" });
    const { userId } = req.params;
    try {
        const dataDir = path.join(process.cwd(), 'data');
        const files = await fs.promises.readdir(dataDir);
        const collections = files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
        
        for(const coll of collections) {
            const data = await storage.readCollection<any>(coll);
            const filteredData = data.filter((item: any) => !(item.userId === userId || item.memberIds?.includes(userId) || item.id === userId));
            await storage.writeCollection(coll, filteredData);
        }
        res.json({ message: "Dados do usuário excluídos com sucesso" });
    } catch (e) {
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
  app.post("/api/auth/register", async (req, res) => {
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

  app.post("/api/auth/login", async (req, res) => {
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
        
        const buffer = zipTele.toBuffer();
        const formTele = new FormData();
        formTele.append('chat_id', cloudConfig.telegramChatId);
        formTele.append('caption', `📦 *Backup de Segurança Pré-Atualização*\n📅 ${new Date().toLocaleString('pt-BR')}`);
        formTele.append('document', new Blob([buffer]), `backup-pre-update-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);

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
      
      const buffer = zip.toBuffer();

      const form = new FormData();
      form.append('chat_id', cloudConfig.telegramChatId);
      form.append('caption', `🧪 *Teste de Backup*\n📅 ${new Date().toLocaleString('pt-BR')}`);
      form.append('document', new Blob([buffer]), 'teste-backup.zip');

      const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, '');
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
        method: 'POST',
        body: form as any
      });

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

  app.post("/api/backup/import", authenticateToken, upload.single('file'), async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') return res.status(403).send("Acesso negado");

    const file = (req as any).file;
    if (!file) return res.status(400).send("Arquivo não enviado");

    try {
      const zip = new AdmZip(file.path);
      const cwd = process.cwd();
      
      // Extrai tudo para a raiz do projeto (vai sobrescrever data/ e uploads/)
      zip.extractAllTo(cwd, true);
      
      // Cleanup uploaded file
      fs.unlinkSync(file.path);
      
      console.log('Backup completo (dados e imagens) importado com sucesso!');
      res.json({ ok: true });
    } catch (error) {
      console.error("Erro ao importar backup:", error);
      res.status(500).json({ error: "Erro ao processar arquivo de backup" });
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

  app.get("/api/collections/:name", authenticateToken, async (req, res) => {
    try {
      let data = await storage.readCollection(req.params.name);
      
      // Data leak prevention for users collection
      if (req.params.name === 'users') {
        data = data.map((user: any) => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados" });
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

  app.post("/api/collections/:name", authenticateToken, async (req: any, res) => {
    try {
      const requester = req.user;
      const restrictedCollections = ['users', 'ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles'];
      
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
         const restrictedCollections = ['ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles'];
         
         if (restrictedCollections.includes(req.params.name) && requester.role !== 'admin' && requester.role !== 'superadmin') {
           // Permitir que membros solicitem entrada (patch no campo pendingRequestIds)
           if (req.params.name === 'ministries' && (req.method === 'PATCH' || req.method === 'PUT')) {
             const updates = Object.keys(req.body);
             if (updates.length === 1 && updates[0] === 'pendingRequestIds') {
               // OK - permitimos apenas este campo para solicitação de entrada
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
               return res.status(403).json({ error: "Você não tem permissão para editar este item." });
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
      const restrictedCollections = ['users', 'ministries', 'announcements', 'readingPlans', 'sermons', 'transactions', 'funds', 'financialRules', 'cells', 'config', 'adminRoles'];
      
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
