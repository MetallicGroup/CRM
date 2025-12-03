import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, createUserSchema, updateUserSchema, createClientSchema, updateClientSchema } from "@shared/schema";
import { z } from "zod";

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  specialKey?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Neautorizat - trebuie să vă autentificați" });
  }
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  req.specialKey = req.session.specialKey;
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ message: "Acces interzis - doar administratorii" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.userRole || "")) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ROUTES ============

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.validatePassword(data.email, data.password);
      
      if (!user) {
        return res.status(401).json({ message: "Email sau parolă incorectă" });
      }
      
      if (!user.active) {
        return res.status(401).json({ message: "Contul a fost dezactivat" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.specialKey = user.specialKey || undefined;

      await storage.updateLastLogin(user.id);

      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Eroare la autentificare" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Eroare la deconectare" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Deconectat cu succes" });
    });
  });

  // Get current session
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.active) {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }

      await storage.updateLastActivity(user.id);
      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Session error:", error);
      res.json({ user: null });
    }
  });

  // ============ USER MANAGEMENT ROUTES (Admin only) ============

  // Get all users
  app.get("/api/users", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Eroare la încărcarea utilizatorilor" });
    }
  });

  // Create user
  app.post("/api/users", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Acest email este deja folosit" });
      }

      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Eroare la crearea utilizatorului" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateUserSchema.parse(req.body);
      
      if (data.email) {
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Acest email este deja folosit" });
        }
      }

      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ message: "Utilizator negăsit" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Eroare la actualizarea utilizatorului" });
    }
  });

  // Reset password (admin)
  app.post("/api/users/:id/reset-password", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Parola trebuie să aibă minim 6 caractere" });
      }

      await storage.changePassword(id, newPassword);
      res.json({ message: "Parola a fost resetată cu succes" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Eroare la resetarea parolei" });
    }
  });

  // Deactivate/Activate user
  app.patch("/api/users/:id/toggle-active", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Utilizator negăsit" });
      }

      if (user.id === req.userId) {
        return res.status(400).json({ message: "Nu vă puteți dezactiva propriul cont" });
      }

      const updated = await storage.updateUser(id, { active: !user.active });
      res.json(updated);
    } catch (error) {
      console.error("Toggle active error:", error);
      res.status(500).json({ message: "Eroare la actualizarea stării contului" });
    }
  });

  // Change own password
  app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Parola nouă trebuie să aibă minim 6 caractere" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilizator negăsit" });
      }

      const isValid = await storage.validatePassword(user.email, currentPassword);
      if (!isValid) {
        return res.status(400).json({ message: "Parola curentă este incorectă" });
      }

      await storage.changePassword(req.userId!, newPassword);
      res.json({ message: "Parola a fost schimbată cu succes" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Eroare la schimbarea parolei" });
    }
  });

  // ============ CLIENT ROUTES ============

  // Get all clients
  app.get("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, status, search } = req.query;
      
      // Non-admins can only see their own clients
      let filterAgentId = agentId as string | undefined;
      if (req.userRole !== "ADMIN") {
        filterAgentId = req.userId;
      }

      const clients = await storage.getAllClients({
        agentId: filterAgentId,
        status: status as string | undefined,
        search: search as string | undefined,
      });
      
      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Eroare la încărcarea clienților" });
    }
  });

  // Get client stats
  app.get("/api/clients/stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.userRole !== "ADMIN" ? req.userId : (req.query.agentId as string | undefined);
      const stats = await storage.getClientStats(agentId);
      res.json(stats);
    } catch (error) {
      console.error("Get client stats error:", error);
      res.status(500).json({ message: "Eroare la încărcarea statisticilor" });
    }
  });

  // Get single client
  app.get("/api/clients/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const client = await storage.getClient(req.params.id);
      
      if (!client) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      // Non-admins can only see their own clients
      if (req.userRole !== "ADMIN" && client.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți acces la acest client" });
      }

      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ message: "Eroare la încărcarea clientului" });
    }
  });

  // Create client
  app.post("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const data = createClientSchema.parse(req.body);
      
      // RBAC: Non-admins can only create clients assigned to themselves
      if (req.userRole !== "ADMIN") {
        data.agentId = req.userId;
      } else if (!data.agentId) {
        // Admin creates without agent - leave unassigned
        data.agentId = undefined;
      }

      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create client error:", error);
      res.status(500).json({ message: "Eroare la crearea clientului" });
    }
  });

  // Update client
  app.patch("/api/clients/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const existingClient = await storage.getClient(req.params.id);
      
      if (!existingClient) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      // Non-admins can only update their own clients
      if (req.userRole !== "ADMIN" && existingClient.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți permisiunea să modificați acest client" });
      }

      const data = updateClientSchema.parse(req.body);
      
      // RBAC: Non-admins cannot change the agent assignment
      if (req.userRole !== "ADMIN") {
        delete data.agentId;
      }

      const client = await storage.updateClient(req.params.id, data);
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update client error:", error);
      res.status(500).json({ message: "Eroare la actualizarea clientului" });
    }
  });

  // Delete client (admin only)
  app.delete("/api/clients/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      res.json({ message: "Client șters cu succes" });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ message: "Eroare la ștergerea clientului" });
    }
  });

  return httpServer;
}
