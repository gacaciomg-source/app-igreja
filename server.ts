import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as storage from "./src/lib/storage";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import cron from 'node-cron';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// --- WhatsApp Global State ---
let whatsappClient: any | null = null;
let lastQr: string | null = null;
let whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'AUTHENTRICATING' = 'DISCONNECTED';
let whatsappError: string | null = null;

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

  const lockFile = path.join(process.cwd(), '.wwebjs_auth', 'session', 'SingletonLock');
  const cookieFile = path.join(process.cwd(), '.wwebjs_auth', 'session', 'SingletonCookie');
  try {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
  } catch (e) {
    console.error('Failed to remove Singleton files', e);
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions']
    }
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('WhatsApp QR Code generated');
    lastQr = await qrcode.toDataURL(qr);
    whatsappStatus = 'DISCONNECTED';
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    whatsappStatus = 'READY';
    lastQr = null;
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp Authenticated');
    whatsappStatus = 'AUTHENTRICATING';
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('WhatsApp Auth failure:', msg);
    whatsappStatus = 'DISCONNECTED';
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp Disconnected:', reason);
    whatsappStatus = 'DISCONNECTED';
    lastQr = null;
    whatsappClient = null;
    setTimeout(initWhatsApp, 5000);
  });

  try {
    await whatsappClient.initialize();
  } catch (err: any) {
    console.error('Failed to initialize WhatsApp:', err);
    whatsappError = err.message || String(err);
    if (whatsappError.includes('Execution context was destroyed') || whatsappError.includes('browser is already running')) {
        whatsappError += ' (Dica: Encerre processos "chrome.exe" / "node.exe" perdidos no Gerenciador de Tarefas do Windows ou apague a pasta .wwebjs_auth)';
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
          const updatedUser = {
            ...existingUser,
            name: name || existingUser.name,
            email: normalizedEmail,
            password: hashedPassword,
            age: parseInt(age) || existingUser.age || 0,
            address: address || existingUser.address || "",
            phone: phone || existingUser.phone || "",
            memberStatus: "new_member", // Advance status from visitor to new_member
            joinedAt: existingUser.joinedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPreRegistered: false // No longer just a placeholder
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

  app.listen(PORT, "0.0.0.0", () => {
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
