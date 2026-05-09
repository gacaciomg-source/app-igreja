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
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import cron from 'node-cron';
import AdmZip from 'adm-zip';
import multer from 'multer';
import FormData from 'form-data';

const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// --- WhatsApp Global State ---
let whatsappClient: any | null = null;
let lastQr: string | null = null;
let whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'AUTHENTRICATING' = 'DISCONNECTED';
let whatsappError: string | null = null;

const START_TIME = Date.now();

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
  const sessionPath = path.join(authPath, 'session');
  
  // Limpeza de arquivos de trava do Puppeteer que impedem reinicialização
  try {
    const lockFiles = [
      path.join(sessionPath, 'SingletonLock'),
      path.join(sessionPath, 'SingletonCookie'),
      path.join(sessionPath, 'SingletonSocket')
    ];
    lockFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`Limpando arquivo de trava: ${file}`);
        fs.unlinkSync(file);
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
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
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
      zip.addLocalFolder(dataDir);
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
        form.append('document', fs.createReadStream(filePath));

        const response = await fetch(`https://api.telegram.org/bot${cloudConfig.telegramToken}/sendDocument`, {
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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  // --- Auth API ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, age, address, phone } = req.body;
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
            age: parseInt(age) || existingUser.age || 0,
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
        age: parseInt(age) || 0,
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
        uptime: Math.floor(os.uptime())
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

  app.post("/api/system/update", authenticateToken, async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'superadmin') return res.status(403).send("Acesso negado");
    
    const { exec } = await import('child_process');
    // Comando mais seguro: fetch + reset (pula o merge interativo que trava em scripts)
    // Isso garante que o código local fique IDÊNTICO ao do Git, mas NÃO mexe em pastas ignoradas (como data/)
    const command = 'git fetch origin main && git reset --hard origin/main';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro na Atualização: ${error.message}`);
        return res.status(500).json({ error: error.message, details: stderr });
      }
      console.log(`Sistema Atualizado via Git: ${stdout}`);
      res.json({ ok: true, output: stdout });
    });
  });

  app.get("/api/backup", authenticateToken, async (req, res) => {
    try {
      // Return a JSON containing all collections
      const collections = [
        'users', 'events', 'prayers', 'announcements', 'cells', 
        'readingPlans', 'pastoralVisits', 'titheTransactions', 
        'attendances', 'config', 'ministries', 'ministrySchedules', 'adminRoles'
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
      if (!fs.existsSync(dataDir)) {
          return res.status(404).json({ error: "Pasta de dados não encontrada" });
      }

      const zip = new AdmZip();
      zip.addLocalFolder(dataDir);
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

      const dataDir = path.join(process.cwd(), 'data');
      const zip = new AdmZip();
      zip.addLocalFolder(dataDir);
      const buffer = zip.toBuffer();

      const form = new FormData();
      form.append('chat_id', cloudConfig.telegramChatId);
      form.append('caption', `🧪 *Teste de Backup*\n📅 ${new Date().toLocaleString('pt-BR')}`);
      form.append('document', buffer, { filename: 'teste-backup.zip', contentType: 'application/zip' });

      const response = await fetch(`https://api.telegram.org/bot${cloudConfig.telegramToken}/sendDocument`, {
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
      const dataDir = path.join(process.cwd(), 'data');
      
      // Limpa pasta atual
      if (fs.existsSync(dataDir)) {
          const files = fs.readdirSync(dataDir);
          for (const file of files) {
              if (file.endsWith('.json')) {
                  fs.unlinkSync(path.join(dataDir, file));
              }
          }
      } else {
          fs.mkdirSync(dataDir, { recursive: true });
      }

      zip.extractAllTo(dataDir, true);
      
      // Cleanup uploaded file
      fs.unlinkSync(file.path);
      
      console.log('Backup importado com sucesso!');
      res.json({ ok: true });
    } catch (error) {
      console.error("Erro ao importar backup:", error);
      res.status(500).json({ error: "Erro ao processar arquivo de backup" });
    }
  });

  app.get("/api/collections/:name", authenticateToken, async (req, res) => {
    try {
      const data = await storage.readCollection(req.params.name);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados" });
    }
  });

  app.post("/api/collections/:name", authenticateToken, async (req, res) => {
    try {
      const newItem = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      await storage.insert(req.params.name, newItem);
      
      // WhatsApp Notification Trigger
      if (req.params.name === 'prayers') {
        const privacy = newItem.privacy === 'private' ? 'Privado' : 'Público';
        sendWhatsAppNotifications(`🙏 *Novo Pedido de Oração*\n\n*Membro:* ${(req as any).user.name || 'Desconhecido'}\n*Privacidade:* ${privacy}\n*Mensagem:* ${newItem.content}`).catch(e => console.error("WhatsApp notification failed:", e));
      } else if (req.params.name === 'pastoralVisits') {
        sendWhatsAppNotifications(`🏡 *Nova Visita Pastoral*\n\n*Solicitante:* ${(req as any).user.name || 'Desconhecido'}\n*Motivo:* ${newItem.reason || 'Não informado'}`).catch(e => console.error("WhatsApp notification failed:", e));
      }
      
      res.json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar" });
    }
  });

  app.patch("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
      // Role Validation for Users collection
      if (req.params.name === 'users') {
        const targetId = req.params.id;
        const requester = (req as any).user;
        const updates = req.body;

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
          // (unless it's superadmin changing others, but here we prevent any user from changing their OWN role field)
          if (targetId === requester.id && updates.role !== requester.role) {
             return res.status(403).json({ error: "Você não pode alterar sua própria função" });
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

  app.delete("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
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
