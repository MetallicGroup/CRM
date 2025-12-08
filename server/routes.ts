import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, createUserSchema, updateUserSchema, createClientSchema, updateClientSchema, createTargetSchema, updateTargetSchema, createPartnerSchema, updatePartnerSchema, createSediuSchema, updateSediuSchema, createExpenseCategorySchema, updateExpenseCategorySchema, createCheltuialaAgentSchema, updateCheltuialaAgentSchema, createCheltuialaSediuSchema, updateCheltuialaSediuSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

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

  // ============ DASHBOARD ROUTES ============

  // Get dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = req.userRole !== "ADMIN" ? req.userId : (req.query.agentId as string | undefined);
      const [clientStats, activeAgentsCount] = await Promise.all([
        storage.getClientStats(agentId),
        storage.getActiveAgentsCount()
      ]);
      
      res.json({
        clients: clientStats,
        activeAgents: activeAgentsCount
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Eroare la încărcarea statisticilor" });
    }
  });

  // Get agents list (for filters)
  app.get("/api/dashboard/agents", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Non-admins can only see themselves
      if (req.userRole !== "ADMIN") {
        const user = await storage.getUser(req.userId!);
        if (user) {
          const { passwordHash, ...safeUser } = user;
          return res.json([safeUser]);
        }
        return res.json([]);
      }
      
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Get agents error:", error);
      res.status(500).json({ message: "Eroare la încărcarea agenților" });
    }
  });

  // ============ CLIENT ROUTES ============

  // Get all clients
  app.get("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, stadiuOferta, search } = req.query;
      
      // Non-admins can only see their own clients
      let filterAgentId = agentId as string | undefined;
      if (req.userRole !== "ADMIN") {
        filterAgentId = req.userId;
      }

      const clients = await storage.getAllClients({
        agentId: filterAgentId,
        stadiuOferta: stadiuOferta as string | undefined,
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
      
      // Auto-recalculate profitability if client is VANDUT with an agent
      if (client.stadiuOferta === "VANDUT" && client.agentId && client.dataVanzarii) {
        const saleDate = new Date(client.dataVanzarii);
        const luna = saleDate.getMonth() + 1;
        const an = saleDate.getFullYear();
        await storage.recomputeAgentMonthlyProfit(client.agentId, an, luna);
      }
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create client error:", error);
      res.status(500).json({ message: "Eroare la crearea clientului" });
    }
  });

  // Import clients from CSV (admin only)
  const importRowSchema = z.object({
    nume: z.string().min(1).optional(),
    telefon: z.string().optional(),
    email: z.string().optional(),
    localitate: z.string().optional(),
    judet: z.string().optional(),
    dataOfertarii: z.string().optional(),
    sursa: z.string().optional(),
    mlRulouProd: z.string().optional(),
    valoareOferta: z.string().optional(),
    categorieProdus: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    suprafataMp: z.string().optional(),
    culoare: z.string().optional(),
    grosime: z.string().optional(),
    finisaj: z.string().optional(),
    smartDripstop: z.string().optional(),
    dataRevenire1: z.string().optional(),
    comentariuObservatii1: z.string().optional(),
    dataRevenire2: z.string().optional(),
    comentariuObservatii2: z.string().optional(),
    stadiuOferta: z.string().optional(),
    dataVanzarii: z.string().optional(),
    stadiuComanda: z.string().optional(),
    dataLivrarii: z.string().optional(),
    incasat: z.string().optional(),
    procentComision: z.string().optional(),
  });

  const importPayloadSchema = z.object({
    rows: z.array(importRowSchema).min(1).max(5000),
    agentId: z.string().optional(),
    duplicateStrategy: z.enum(["skip", "update", "create"]).optional().default("skip"),
  });

  app.post("/api/clients/import", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = importPayloadSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Datele de import sunt invalide: " + parsed.error.errors[0].message 
        });
      }

      const { rows, agentId, duplicateStrategy } = parsed.data;

      const result = await storage.bulkImportClients(
        rows as any,
        agentId,
        duplicateStrategy
      );
      
      res.json(result);
    } catch (error) {
      console.error("Import clients error:", error);
      res.status(500).json({ message: "Eroare la importul clienților" });
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
      
      // Auto-recalculate profitability when relevant fields change
      const wasVandut = existingClient.stadiuOferta === "VANDUT";
      const isNowVandut = client?.stadiuOferta === "VANDUT";
      
      // Recalculate for old agent/date if it was VANDUT before (to subtract it)
      if (wasVandut && existingClient.agentId && existingClient.dataVanzarii) {
        const oldSaleDate = new Date(existingClient.dataVanzarii);
        const oldLuna = oldSaleDate.getMonth() + 1;
        const oldAn = oldSaleDate.getFullYear();
        await storage.recomputeAgentMonthlyProfit(existingClient.agentId, oldAn, oldLuna);
      }
      
      // Recalculate for new agent/date if it's VANDUT now (to add it)
      if (isNowVandut && client?.agentId && client?.dataVanzarii) {
        const newSaleDate = new Date(client.dataVanzarii);
        const newLuna = newSaleDate.getMonth() + 1;
        const newAn = newSaleDate.getFullYear();
        // Only recalculate if it's different from what we just recalculated
        if (!wasVandut || 
            existingClient.agentId !== client.agentId || 
            existingClient.dataVanzarii?.getTime() !== new Date(client.dataVanzarii).getTime()) {
          await storage.recomputeAgentMonthlyProfit(client.agentId, newAn, newLuna);
        }
      }
      
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
      // Get client before deletion for profitability recalculation
      const existingClient = await storage.getClient(req.params.id);
      
      const deleted = await storage.deleteClient(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client negăsit" });
      }
      
      // Recalculate profitability if deleted client was VANDUT
      if (existingClient?.stadiuOferta === "VANDUT" && existingClient.agentId && existingClient.dataVanzarii) {
        const saleDate = new Date(existingClient.dataVanzarii);
        const luna = saleDate.getMonth() + 1;
        const an = saleDate.getFullYear();
        await storage.recomputeAgentMonthlyProfit(existingClient.agentId, an, luna);
      }

      res.json({ message: "Client șters cu succes" });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ message: "Eroare la ștergerea clientului" });
    }
  });

  // ============ PROFILE ROUTES ============

  // Update own profile
  app.patch("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { firstName, lastName, email } = req.body;
      
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.userId) {
          return res.status(400).json({ message: "Email-ul este deja folosit" });
        }
      }

      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;

      const user = await storage.updateUser(req.userId!, updateData);
      res.json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Eroare la actualizarea profilului" });
    }
  });

  // Change own password
  app.post("/api/profile/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Ambele parole sunt obligatorii" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Parola nouă trebuie să aibă minim 6 caractere" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilizator negăsit" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
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

  // ============ TARGET ROUTES ============

  // Get all targets
  app.get("/api/targets", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an } = req.query;
      
      // Non-admins can only see their own targets
      const filters: any = {};
      if (req.userRole !== "ADMIN") {
        filters.agentId = req.userId;
      } else if (agentId) {
        filters.agentId = agentId as string;
      }
      
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);
      
      const targets = await storage.getAllTargets(filters);
      res.json(targets);
    } catch (error) {
      console.error("Get targets error:", error);
      res.status(500).json({ message: "Eroare la încărcarea target-urilor" });
    }
  });

  // Get target progress (agents only see their own)
  app.get("/api/targets/progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an } = req.query;
      
      // Non-admins can ONLY see their own progress - ignore agentId parameter
      const targetAgentId = req.userRole !== "ADMIN" ? req.userId! : (agentId as string || req.userId!);
      const targetLuna = parseInt(luna as string) || new Date().getMonth() + 1;
      const targetAn = parseInt(an as string) || new Date().getFullYear();

      const progress = await storage.getTargetProgress(targetAgentId, targetLuna, targetAn);
      res.json(progress);
    } catch (error) {
      console.error("Get target progress error:", error);
      res.status(500).json({ message: "Eroare la încărcarea progresului" });
    }
  });

  // Create target (admin only)
  app.post("/api/targets", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createTargetSchema.parse(req.body);
      const target = await storage.createTarget(data);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create target error:", error);
      res.status(500).json({ message: "Eroare la crearea target-ului" });
    }
  });

  // Update target (admin only)
  app.patch("/api/targets/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updateTargetSchema.parse(req.body);
      const target = await storage.updateTarget(req.params.id, data);
      
      if (!target) {
        return res.status(404).json({ message: "Target negăsit" });
      }

      res.json(target);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update target error:", error);
      res.status(500).json({ message: "Eroare la actualizarea target-ului" });
    }
  });

  // Delete target (admin only)
  app.delete("/api/targets/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteTarget(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Target negăsit" });
      }

      res.json({ message: "Target șters cu succes" });
    } catch (error) {
      console.error("Delete target error:", error);
      res.status(500).json({ message: "Eroare la ștergerea target-ului" });
    }
  });

  // ============ PARTNER ROUTES ============

  // Get all partners
  app.get("/api/partners", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { tipPartener, activ, search } = req.query;
      
      const filters: any = {};
      if (tipPartener) filters.tipPartener = tipPartener as string;
      if (activ !== undefined) filters.activ = activ === "true";
      if (search) filters.search = search as string;
      
      const partners = await storage.getAllPartners(filters);
      res.json(partners);
    } catch (error) {
      console.error("Get partners error:", error);
      res.status(500).json({ message: "Eroare la încărcarea partenerilor" });
    }
  });

  // Get single partner
  app.get("/api/partners/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const partner = await storage.getPartner(req.params.id);
      
      if (!partner) {
        return res.status(404).json({ message: "Partener negăsit" });
      }

      res.json(partner);
    } catch (error) {
      console.error("Get partner error:", error);
      res.status(500).json({ message: "Eroare la încărcarea partenerului" });
    }
  });

  // Create partner (admin only)
  app.post("/api/partners", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createPartnerSchema.parse(req.body);
      const partner = await storage.createPartner(data);
      res.status(201).json(partner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create partner error:", error);
      res.status(500).json({ message: "Eroare la crearea partenerului" });
    }
  });

  // Update partner (admin only)
  app.patch("/api/partners/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updatePartnerSchema.parse(req.body);
      const partner = await storage.updatePartner(req.params.id, data);
      
      if (!partner) {
        return res.status(404).json({ message: "Partener negăsit" });
      }

      res.json(partner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update partner error:", error);
      res.status(500).json({ message: "Eroare la actualizarea partenerului" });
    }
  });

  // Delete partner (admin only)
  app.delete("/api/partners/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deletePartner(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Partener negăsit" });
      }

      res.json({ message: "Partener șters cu succes" });
    } catch (error) {
      console.error("Delete partner error:", error);
      res.status(500).json({ message: "Eroare la ștergerea partenerului" });
    }
  });

  // ============ SEDII ROUTES ============

  // Get all sedii
  app.get("/api/sedii", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { activ } = req.query;
      const activFilter = activ === "true" ? true : activ === "false" ? false : undefined;
      const sediuList = await storage.getAllSedii(activFilter);
      res.json(sediuList);
    } catch (error) {
      console.error("Get sedii error:", error);
      res.status(500).json({ message: "Eroare la încărcarea sediilor" });
    }
  });

  // Get single sediu
  app.get("/api/sedii/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const sediu = await storage.getSediu(req.params.id);
      if (!sediu) {
        return res.status(404).json({ message: "Sediu negăsit" });
      }
      res.json(sediu);
    } catch (error) {
      console.error("Get sediu error:", error);
      res.status(500).json({ message: "Eroare la încărcarea sediului" });
    }
  });

  // Create sediu (admin only)
  app.post("/api/sedii", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createSediuSchema.parse(req.body);
      const sediu = await storage.createSediu(data);
      res.status(201).json(sediu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create sediu error:", error);
      res.status(500).json({ message: "Eroare la crearea sediului" });
    }
  });

  // Update sediu (admin only)
  app.patch("/api/sedii/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updateSediuSchema.parse(req.body);
      const sediu = await storage.updateSediu(req.params.id, data);
      if (!sediu) {
        return res.status(404).json({ message: "Sediu negăsit" });
      }
      res.json(sediu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update sediu error:", error);
      res.status(500).json({ message: "Eroare la actualizarea sediului" });
    }
  });

  // Delete sediu (admin only)
  app.delete("/api/sedii/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteSediu(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Sediu negăsit" });
      }
      res.json({ message: "Sediu șters cu succes" });
    } catch (error) {
      console.error("Delete sediu error:", error);
      res.status(500).json({ message: "Eroare la ștergerea sediului" });
    }
  });

  // ============ EXPENSE CATEGORIES ROUTES (Cascading dropdowns) ============

  // Get main categories (level 1)
  app.get("/api/expense-categories/main", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const categories = await storage.getExpenseCategoriesByLevel("main");
      res.json(categories);
    } catch (error) {
      console.error("Get main categories error:", error);
      res.status(500).json({ message: "Eroare la încărcarea categoriilor" });
    }
  });

  // Get subcategories by parent (level 2)
  app.get("/api/expense-categories/sub/:parentId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const categories = await storage.getExpenseCategoriesByParent(req.params.parentId);
      res.json(categories);
    } catch (error) {
      console.error("Get subcategories error:", error);
      res.status(500).json({ message: "Eroare la încărcarea subcategoriilor" });
    }
  });

  // Get detail categories by parent (level 3)
  app.get("/api/expense-categories/detail/:parentId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const categories = await storage.getExpenseCategoriesByParent(req.params.parentId);
      res.json(categories);
    } catch (error) {
      console.error("Get detail categories error:", error);
      res.status(500).json({ message: "Eroare la încărcarea detaliilor" });
    }
  });

  // Create expense category (admin only)
  app.post("/api/expense-categories", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create expense category error:", error);
      res.status(500).json({ message: "Eroare la crearea categoriei" });
    }
  });

  // Update expense category (admin only)
  app.patch("/api/expense-categories/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updateExpenseCategorySchema.parse(req.body);
      const category = await storage.updateExpenseCategory(req.params.id, data);
      if (!category) {
        return res.status(404).json({ message: "Categorie negăsită" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update expense category error:", error);
      res.status(500).json({ message: "Eroare la actualizarea categoriei" });
    }
  });

  // ============ CHELTUIELI AGENT ROUTES ============

  // Get all cheltuieli agent
  app.get("/api/cheltuieli-agent", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an, categoryId, sediuId, firma } = req.query;
      
      // Non-admins can only see their own expenses
      const filters: any = {};
      if (req.userRole !== "ADMIN") {
        filters.agentId = req.userId;
      } else if (agentId) {
        filters.agentId = agentId as string;
      }
      
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);
      if (categoryId) filters.categoryId = categoryId as string;
      if (sediuId) filters.sediuId = sediuId as string;
      if (firma) filters.firma = firma as string;
      
      const cheltuieli = await storage.getAllCheltuieliAgent(filters);
      res.json(cheltuieli);
    } catch (error) {
      console.error("Get cheltuieli agent error:", error);
      res.status(500).json({ message: "Eroare la încărcarea cheltuielilor" });
    }
  });

  // Get cheltuieli agent stats
  app.get("/api/cheltuieli-agent/stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an } = req.query;
      
      const filters: any = {};
      if (req.userRole !== "ADMIN") {
        filters.agentId = req.userId;
      } else if (agentId) {
        filters.agentId = agentId as string;
      }
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);
      
      const stats = await storage.getCheltuieliAgentStats(filters);
      res.json(stats);
    } catch (error) {
      console.error("Get cheltuieli agent stats error:", error);
      res.status(500).json({ message: "Eroare la încărcarea statisticilor" });
    }
  });

  // Get single cheltuiala agent
  app.get("/api/cheltuieli-agent/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const cheltuiala = await storage.getCheltuialaAgent(req.params.id);
      if (!cheltuiala) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      
      // Non-admins can only see their own expenses
      if (req.userRole !== "ADMIN" && cheltuiala.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți acces la această cheltuială" });
      }
      
      res.json(cheltuiala);
    } catch (error) {
      console.error("Get cheltuiala agent error:", error);
      res.status(500).json({ message: "Eroare la încărcarea cheltuielii" });
    }
  });

  // Create cheltuiala agent (admin only)
  app.post("/api/cheltuieli-agent", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createCheltuialaAgentSchema.parse(req.body);
      const cheltuiala = await storage.createCheltuialaAgent(data);
      res.status(201).json(cheltuiala);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create cheltuiala agent error:", error);
      res.status(500).json({ message: "Eroare la crearea cheltuielii" });
    }
  });

  // Update cheltuiala agent (admin only)
  app.patch("/api/cheltuieli-agent/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updateCheltuialaAgentSchema.parse(req.body);
      const cheltuiala = await storage.updateCheltuialaAgent(req.params.id, data);
      if (!cheltuiala) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      res.json(cheltuiala);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update cheltuiala agent error:", error);
      res.status(500).json({ message: "Eroare la actualizarea cheltuielii" });
    }
  });

  // Delete cheltuiala agent (admin only)
  app.delete("/api/cheltuieli-agent/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteCheltuialaAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      res.json({ message: "Cheltuială ștearsă cu succes" });
    } catch (error) {
      console.error("Delete cheltuiala agent error:", error);
      res.status(500).json({ message: "Eroare la ștergerea cheltuielii" });
    }
  });

  // Import cheltuieli (admin only)
  const expenseImportRowSchema = z.object({
    Suma: z.string().optional(),
    Judet: z.string().optional(),
    Data: z.string().optional(),
    Agent: z.string().optional(),
    "Tip Cheltuiala": z.string().optional(),
    "Cheltuieli Showroom": z.string().optional(),
    "Cheltuieli Auto": z.string().optional(),
    "Auto Nr": z.string().optional(),
    Firma: z.string().optional(),
  });

  const expenseImportPayloadSchema = z.object({
    rows: z.array(expenseImportRowSchema).min(1).max(10000),
  });

  app.post("/api/cheltuieli-agent/import", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = expenseImportPayloadSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Datele de import sunt invalide: " + parsed.error.errors[0].message 
        });
      }

      const { rows } = parsed.data;

      // Category mappings
      const categoryMap: Record<string, string> = {
        "auto": "cat-auto",
        "showroom": "cat-generale",
        "generale": "cat-generale",
        "angajati": "cat-salarii",
        "bugete stat": "cat-bugete",
        "altele": "cat-generale",
      };

      // Subcategory mappings for Auto
      const autoSubcategoryMap: Record<string, string> = {
        "combustibil": "838bc6c6-83fb-4e1e-b1f1-e770714396a0",
        "asigurare": "ea32e8a4-8b48-477e-bff2-d4a0c7103149",
        "leasing": "f7bc70b5-9611-48db-8550-838df8b174a4",
        "rovigneta": "f1aab9e2-eb23-4a72-831a-4b34154a5a1e",
        "rovinieta": "f1aab9e2-eb23-4a72-831a-4b34154a5a1e",
        "service": "95bb26dc-5f13-4ded-9d04-8e0b8d5105a9",
        "revizii": "95bb26dc-5f13-4ded-9d04-8e0b8d5105a9",
        "altele": "sub-alte",
      };

      // Subcategory mappings for Showroom/Generale
      const showroomSubcategoryMap: Record<string, string> = {
        "utilitati": "c3b11246-7867-40f5-ba0b-511dad776321",
        "consumabile": "sub-materiale",
        "chirie": "c3b11246-7867-40f5-ba0b-511dad776321",
        "marketing": "eb6d1178-49ee-43ee-8d27-3c704182cb0f",
        "altele": "sub-alte",
      };

      // Agent name to ID mapping
      const agentNameMap: Record<string, string> = {
        "marian toma": "ag_marian_t",
        "dragos frangache": "ag_dragos",
        "dragos": "ag_dragos",
        "bebe marius": "ag_marian_c",
        "marian costache": "ag_marian_c",
        "mihai coman": "ag_marian_t",
        "dana marcu": "ag_iulian_m",
        "iulian marcu": "ag_iulian_m",
        "raluca munteanu": "ag_alexandra",
        "raluca": "ag_alexandra",
        "razvan rosu": "ag_dragos",
        "oana": "ag_oana",
        "adrian radu": "ag_marian_t",
        "alexandru croitoru": "ag_alexandru_c",
        "cristina toma": "ag_cristina_t",
        "alexandra": "ag_alexandra",
      };

      const parseValue = (val: string | undefined): string | undefined => {
        if (!val) return undefined;
        const cleaned = val.replace(/LEI\s*/gi, "").replace(/[,\s]/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num.toString();
      };

      const parseDate = (dateStr: string | undefined): { date: Date; luna: number; an: number } | undefined => {
        if (!dateStr || dateStr.trim() === "") return undefined;
        const trimmed = dateStr.trim();
        if (trimmed.includes("/")) {
          const parts = trimmed.split("/");
          if (parts.length >= 2) {
            let first = parseInt(parts[0]);
            let second = parseInt(parts[1]);
            const year = parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();
            
            if (isNaN(first) || isNaN(second) || isNaN(year)) return undefined;
            
            const fullYear = year < 100 ? 2000 + year : year;
            
            // Validate year range
            if (fullYear < 1900 || fullYear > 2100) return undefined;
            
            let month: number;
            let day: number;
            
            // Smart format detection: if first > 12, it must be day (D/M/YYYY format)
            // if second > 12, it must be day (M/D/YYYY format)
            if (first > 12 && second <= 12) {
              // D/M/YYYY format (European)
              day = first;
              month = second;
            } else if (first <= 12 && second > 12) {
              // M/D/YYYY format (US) - second must be day
              month = first;
              day = second;
            } else {
              // Both could be valid - assume M/D/YYYY (original assumption)
              month = first;
              day = second;
            }
            
            // Validate month and day bounds
            if (month < 1 || month > 12) return undefined;
            if (day < 1 || day > 31) return undefined;
            
            return { 
              date: new Date(fullYear, month - 1, day),
              luna: month,
              an: fullYear
            };
          }
        }
        return undefined;
      };

      let success = 0;
      let errors = 0;
      let skipped = 0;
      const errorDetails: { row: number; error: string; data: Record<string, any> }[] = [];
      const affectedMonths: Set<string> = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          const suma = parseValue(row.Suma);
          if (!suma || parseFloat(suma) === 0) {
            skipped++;
            continue;
          }

          const dateInfo = parseDate(row.Data);
          if (!dateInfo) {
            errors++;
            errorDetails.push({ row: rowNum, error: "Data invalidă", data: row as Record<string, any> });
            continue;
          }

          const tipCheltuiala = (row["Tip Cheltuiala"] || "").toLowerCase().trim();
          const categoryId = categoryMap[tipCheltuiala] || "cat-generale";

          let subcategoryId = "sub-alte";
          if (tipCheltuiala === "auto" && row["Cheltuieli Auto"]) {
            const autoSub = row["Cheltuieli Auto"].toLowerCase().trim();
            subcategoryId = autoSubcategoryMap[autoSub] || "sub-alte";
          } else if ((tipCheltuiala === "showroom" || tipCheltuiala === "generale") && row["Cheltuieli Showroom"]) {
            const showroomSub = row["Cheltuieli Showroom"].toLowerCase().trim();
            subcategoryId = showroomSubcategoryMap[showroomSub] || "sub-alte";
          } else if (tipCheltuiala === "angajati") {
            subcategoryId = "4ff12bb9-46b0-4836-b0a3-759f99eeb820"; // Salariu brut
          } else if (tipCheltuiala === "bugete stat") {
            subcategoryId = "sub-alte";
          }

          // Map agent name to ID
          let agentId: string | undefined = undefined;
          if (row.Agent) {
            const agentName = row.Agent.toLowerCase().trim();
            agentId = agentNameMap[agentName];
          }

          const cheltuialaData = {
            agentId: agentId || undefined,
            categoryId,
            subcategoryId,
            suma,
            descriere: `Import: ${row["Tip Cheltuiala"] || ""} - ${row["Cheltuieli Showroom"] || row["Cheltuieli Auto"] || ""}`.trim(),
            dataCheltuiala: dateInfo.date.toISOString(),
            luna: dateInfo.luna,
            an: dateInfo.an,
            judet: row.Judet !== "Cheltuieli comune" ? row.Judet : undefined,
            firma: row.Firma || "N/A",
            autoNr: row["Auto Nr"] || undefined,
            tipCheltuiala: tipCheltuiala || undefined,
          };

          await storage.createCheltuialaAgent(cheltuialaData as any);
          
          if (agentId) {
            affectedMonths.add(`${agentId}:${dateInfo.an}:${dateInfo.luna}`);
          }
          
          success++;
        } catch (error) {
          errors++;
          errorDetails.push({
            row: rowNum,
            error: error instanceof Error ? error.message : "Eroare necunoscută",
            data: row as Record<string, any>
          });
        }
      }

      res.json({ 
        success, 
        errors, 
        skipped, 
        errorDetails: errorDetails.slice(0, 50),
        affectedMonths: Array.from(affectedMonths)
      });
    } catch (error) {
      console.error("Import cheltuieli error:", error);
      res.status(500).json({ message: "Eroare la importul cheltuielilor" });
    }
  });

  // ============ CHELTUIELI SEDIU ROUTES (Admin only) ============

  // Get all cheltuieli sediu (admin only)
  app.get("/api/cheltuieli-sediu", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { sediuId, luna, an, categoryId, firma } = req.query;
      
      const filters: any = {};
      if (sediuId) filters.sediuId = sediuId as string;
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);
      if (categoryId) filters.categoryId = categoryId as string;
      if (firma) filters.firma = firma as string;
      
      const cheltuieli = await storage.getAllCheltuieliSediu(filters);
      res.json(cheltuieli);
    } catch (error) {
      console.error("Get cheltuieli sediu error:", error);
      res.status(500).json({ message: "Eroare la încărcarea cheltuielilor" });
    }
  });

  // Get cheltuieli sediu stats (admin only)
  app.get("/api/cheltuieli-sediu/stats", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { sediuId, luna, an } = req.query;
      
      const filters: any = {};
      if (sediuId) filters.sediuId = sediuId as string;
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);
      
      const stats = await storage.getCheltuieliSediuStats(filters);
      res.json(stats);
    } catch (error) {
      console.error("Get cheltuieli sediu stats error:", error);
      res.status(500).json({ message: "Eroare la încărcarea statisticilor" });
    }
  });

  // Get single cheltuiala sediu (admin only)
  app.get("/api/cheltuieli-sediu/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const cheltuiala = await storage.getCheltuialaSediu(req.params.id);
      if (!cheltuiala) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      res.json(cheltuiala);
    } catch (error) {
      console.error("Get cheltuiala sediu error:", error);
      res.status(500).json({ message: "Eroare la încărcarea cheltuielii" });
    }
  });

  // Create cheltuiala sediu (admin only)
  app.post("/api/cheltuieli-sediu", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createCheltuialaSediuSchema.parse(req.body);
      const cheltuiala = await storage.createCheltuialaSediu(data);
      res.status(201).json(cheltuiala);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create cheltuiala sediu error:", error);
      res.status(500).json({ message: "Eroare la crearea cheltuielii" });
    }
  });

  // Update cheltuiala sediu (admin only)
  app.patch("/api/cheltuieli-sediu/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = updateCheltuialaSediuSchema.parse(req.body);
      const cheltuiala = await storage.updateCheltuialaSediu(req.params.id, data);
      if (!cheltuiala) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      res.json(cheltuiala);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update cheltuiala sediu error:", error);
      res.status(500).json({ message: "Eroare la actualizarea cheltuielii" });
    }
  });

  // Delete cheltuiala sediu (admin only)
  app.delete("/api/cheltuieli-sediu/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteCheltuialaSediu(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Cheltuială negăsită" });
      }
      res.json({ message: "Cheltuială ștearsă cu succes" });
    } catch (error) {
      console.error("Delete cheltuiala sediu error:", error);
      res.status(500).json({ message: "Eroare la ștergerea cheltuielii" });
    }
  });

  // ============ PROFITABILITY INTEGRATION ROUTES ============

  // Get aggregated expenses mapped to profitability fields for an agent
  app.get("/api/profitabilitate/agent-costs/:agentId", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { luna, an } = req.query;
      
      if (!luna || !an) {
        return res.status(400).json({ message: "Luna și anul sunt obligatorii" });
      }
      
      const costs = await storage.getAgentProfitabilityCosts(
        req.params.agentId,
        parseInt(luna as string),
        parseInt(an as string)
      );
      
      res.json(costs);
    } catch (error) {
      console.error("Get agent profitability costs error:", error);
      res.status(500).json({ message: "Eroare la încărcarea costurilor" });
    }
  });

  // Get aggregated expenses for all agents for a specific month
  app.get("/api/profitabilitate/all-agents-costs", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { luna, an } = req.query;
      
      if (!luna || !an) {
        return res.status(400).json({ message: "Luna și anul sunt obligatorii" });
      }
      
      // Get all agents
      const agents = await storage.getAgents();
      
      // Get costs for each agent
      const result: Record<string, any> = {};
      for (const agent of agents) {
        const costs = await storage.getAgentProfitabilityCosts(
          agent.id,
          parseInt(luna as string),
          parseInt(an as string)
        );
        result[agent.id] = {
          agentName: `${agent.firstName} ${agent.lastName}`,
          ...costs
        };
      }
      
      res.json(result);
    } catch (error) {
      console.error("Get all agents profitability costs error:", error);
      res.status(500).json({ message: "Eroare la încărcarea costurilor" });
    }
  });

  // ============ SALES PROFITABILITY ROUTES ============

  // Get all agents sales profitability for a year
  app.get("/api/profitabilitate/sales", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { an } = req.query;
      
      if (!an) {
        return res.status(400).json({ message: "Anul este obligatoriu" });
      }
      
      const salesData = await storage.getAllAgentsSalesProfitability(parseInt(an as string));
      res.json(salesData);
    } catch (error) {
      console.error("Get all agents sales profitability error:", error);
      res.status(500).json({ message: "Eroare la încărcarea datelor de vânzări" });
    }
  });

  // Get a specific agent's sales profitability for a year
  app.get("/api/profitabilitate/sales/:agentId", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const { an } = req.query;
      
      if (!an) {
        return res.status(400).json({ message: "Anul este obligatoriu" });
      }
      
      const salesData = await storage.getAgentSalesProfitability(agentId, parseInt(an as string));
      res.json(salesData);
    } catch (error) {
      console.error("Get agent sales profitability error:", error);
      res.status(500).json({ message: "Eroare la încărcarea datelor de vânzări" });
    }
  });

  // Manually trigger recalculation of profitability for an agent/month
  app.post("/api/profitabilitate/sales/recalculate", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, an, luna } = req.body;
      
      if (!agentId || !an || !luna) {
        return res.status(400).json({ message: "agentId, an și luna sunt obligatorii" });
      }
      
      const result = await storage.recomputeAgentMonthlyProfit(agentId, an, luna);
      res.json(result);
    } catch (error) {
      console.error("Recalculate agent profitability error:", error);
      res.status(500).json({ message: "Eroare la recalcularea profitabilității" });
    }
  });

  // Recalculate profitability for all agents for a specific month
  app.post("/api/profitabilitate/sales/recalculate-all", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { an, luna } = req.body;
      
      if (!an || !luna) {
        return res.status(400).json({ message: "an și luna sunt obligatorii" });
      }
      
      const agents = await storage.getAgents();
      const results = [];
      
      for (const agent of agents) {
        const profitResult = await storage.recomputeAgentMonthlyProfit(agent.id, an, luna);
        results.push({ 
          agentName: `${agent.firstName} ${agent.lastName}`, 
          ...profitResult 
        });
      }
      
      res.json(results);
    } catch (error) {
      console.error("Recalculate all agents profitability error:", error);
      res.status(500).json({ message: "Eroare la recalcularea profitabilității" });
    }
  });

  // ============ FILE UPLOAD/DOWNLOAD ROUTES ============

  // Get upload URL for a file
  app.post("/api/files/upload-url", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({ message: "Numele fișierului este obligatoriu" });
      }
      
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(filename);
      
      res.json({ 
        url: uploadURL, 
        objectPath,
        method: "PUT" as const 
      });
    } catch (error) {
      console.error("Get upload URL error:", error);
      res.status(500).json({ message: "Eroare la generarea URL-ului de upload" });
    }
  });

  // Download a file
  app.get("/objects/*", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      
      const objectPath = req.path;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Download file error:", error);
      const { ObjectNotFoundError } = await import("./objectStorage");
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Fișierul nu a fost găsit" });
      }
      res.status(500).json({ message: "Eroare la descărcarea fișierului" });
    }
  });

  // Confirm file upload and set ACL (for storing the file path in database)
  app.post("/api/files/confirm-upload", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { objectPath, clientId, fileType } = req.body;
      
      if (!objectPath || !clientId || !fileType) {
        return res.status(400).json({ message: "objectPath, clientId și fileType sunt obligatorii" });
      }
      
      // Update the client record with the file path
      if (fileType === "oferta1") {
        await storage.updateClient(clientId, { ofertaFilename: objectPath });
      } else if (fileType === "oferta2") {
        await storage.updateClient(clientId, { ofertaFilename2: objectPath });
      }
      
      res.json({ success: true, objectPath });
    } catch (error) {
      console.error("Confirm upload error:", error);
      res.status(500).json({ message: "Eroare la confirmarea upload-ului" });
    }
  });

  return httpServer;
}
