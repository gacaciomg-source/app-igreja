import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as storage from "./src/lib/storage.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

  // --- Auth API ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, age, address } = req.body;
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
        createdAt: new Date().toISOString()
      };

      await storage.insert("users", newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET);
      
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
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: "Erro ao entrar" });
    }
  });

  // --- Middleware for Auth ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Generic API Routes for all collections ---
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
      console.log(`Saving to ${req.params.name}:`, req.body);
      const newItem = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      await storage.insert(req.params.name, newItem);
      res.json(newItem);
    } catch (error) {
      console.error(`Error saving to ${req.params.name}:`, error);
      res.status(500).json({ error: "Erro ao salvar" });
    }
  });

  app.patch("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
      console.log(`Updating ${req.params.name}/${req.params.id}:`, req.body);
      const updated = await storage.update(req.params.name, req.params.id, req.body);
      if (!updated) {
        console.warn(`Item ${req.params.id} not found in ${req.params.name}`);
        return res.status(404).json({ error: "Não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error(`Error updating ${req.params.name}/${req.params.id}:`, error);
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

  // --- Vite / Static files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
