import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as storage from "./src/lib/storage.ts";
import pkg from 'whatsapp-web.js';
const { Client, NoAuth } = pkg;
import qrcode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// --- WhatsApp Global State ---
let whatsappClient: any | null = null;
let lastQr: string | null = null;
let whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'AUTHENTRICATING' = 'DISCONNECTED';

function formatPhone(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    // If length is 10 (Area + 8 digits), add '9' to make it 11 (Area + 9 digits)
    if (clean.length === 10) {
        clean = clean.substring(0, 2) + '9' + clean.substring(2);
    }
    // Now ensure it has 11 digits (Are + 9 digits) and add country code 55
    if (clean.length === 11) {
        return '55' + clean;
    }
    return clean;
}

async function sendWhatsAppNotifications(message: string) {
    if (!whatsappClient || whatsappStatus !== 'READY') return;

    try {
        const configs = await storage.readCollection<any>("config");
        const whatsappConfig = configs.find(c => c.id === "whatsapp");                
        
        const phones = whatsappConfig?.adminPhones || [];
        if (Array.isArray(phones)) {
            for (const phone of phones) {
                 const chatId = `${formatPhone(phone)}@c.us`;
                 await whatsappClient.sendMessage(chatId, message);
            }
        }
    } catch (err) {
        console.error('Failed to notify admins via WhatsApp:', err);
    }
}

async function initWhatsApp() {
  if (whatsappClient) return;

  console.log('Initializing WhatsApp Client...');
  whatsappStatus = 'INITIALIZING';

  whatsappClient = new Client({
    authStrategy: new NoAuth(),
    puppeteer: {
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      userDataDir: '/tmp/.puppeteer_cache'
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
  } catch (err) {
    console.error('Failed to initialize WhatsApp:', err);
    whatsappStatus = 'DISCONNECTED';
    whatsappClient = null;
  }
}

// Start WhatsApp on boot
initWhatsApp();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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

  // --- Auth API ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, age, address, phone } = req.body;
      const users = await storage.readCollection<any>("users");
      
      if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "E-mail já cadastrado" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: users.length === 0 ? "superadmin" : "member",
        age: parseInt(age) || 0,
        address: address || "",
        phone: phone || "",
        createdAt: new Date().toISOString()
      };

      await storage.insert("users", newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET);
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: "Erro ao registrar" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const users = await storage.readCollection<any>("users");
      const user = users.find(u => u.email === email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
      
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
        sendWhatsAppNotifications(`🙏 *Novo Pedido de Oração*\n\n*Membro:* ${(req as any).user.name || 'Desconhecido'}\n*Mensagem:* ${newItem.content}`);
      } else if (req.params.name === 'pastoralVisits') {
        sendWhatsAppNotifications(`🏡 *Nova Visita Pastoral*\n\n*Solicitante:* ${(req as any).user.name || 'Desconhecido'}\n*Motivo:* ${newItem.reason || 'Não informado'}`);
      }
      
      res.json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar" });
    }
  });

  app.patch("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
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
      qr: lastQr 
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

  app.post("/api/whatsapp/test", authenticateToken, async (req, res) => {
    try {
      await sendWhatsAppNotifications("✅ *Teste de Conexão WhatsApp*\nSeu sistema de notificações está funcionando perfeitamente!");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao enviar teste: " + (error instanceof Error ? error.message : "Erro desconhecido") });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
