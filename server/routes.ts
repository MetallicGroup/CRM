import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users, clients, partners, expenseCategories, cheltuieliAgent, cheltuieliSediu, sedii, salariiNeproductivi, employees, productCategoryEnum, clientSourceEnum, offerStatusEnum, orderStatusEnum, commissionPercentEnum, agentManualAchizitii, agentFixedCosts, loginSchema, createUserSchema, updateUserSchema, createClientSchema, updateClientSchema, createTargetSchema, updateTargetSchema, createTaskSchema, updateTaskSchema, createPartnerSchema, updatePartnerSchema, createSediuSchema, updateSediuSchema, createExpenseCategorySchema, updateExpenseCategorySchema, createCheltuialaAgentSchema, updateCheltuialaAgentSchema, createCheltuialaSediuSchema, updateCheltuialaSediuSchema, createEmployeeSchema, updateEmployeeSchema, createPartnerMonthlyDataSchema, createDocumentSchema } from "@shared/schema";
import { fetchClientsFromSheet } from "./services/google-sheets";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import { eq, inArray, and } from "drizzle-orm";
import { canUserDeleteClients } from "@shared/clientDeletePermissions";
import { protectClientUpdateFromAccidentalClear } from "./clientUpdateProtection";

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  specialKey?: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Neautorizat - trebuie să vă autentificați" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilizator negăsit" });
    }

    if (!user.active) {
      return res.status(401).json({ message: "Contul dvs. este inactiv" });
    }

    // Refresh request and session data
    req.userId = user.id;
    req.userRole = user.role;
    req.specialKey = user.specialKey || undefined;
    req.userEmail = user.email;
    req.userFirstName = user.firstName;
    req.userLastName = user.lastName;

    if (req.session.userRole !== user.role) {
      req.session.userRole = user.role;
      // Note: we don't necessarily need to await save here, 
      // but it helps ensure consistency for the current request
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Eroare la verificarea autorizării" });
  }
}

function isAdminOrOana(req: AuthRequest): boolean {
  return req.userRole === "ADMIN" || (req.userRole === "SPECIAL" && req.specialKey === "OANA");
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isAdminOrOana(req)) {
    return res.status(403).json({ message: "Acces interzis - doar administratorii" });
  }
  next();
}

function requireClientDeletePermission(req: AuthRequest, res: Response, next: NextFunction) {
  if (
    !canUserDeleteClients({
      role: req.userRole || "",
      firstName: req.userFirstName,
      lastName: req.userLastName,
      specialKey: req.specialKey,
    })
  ) {
    return res.status(403).json({ message: "Nu aveți dreptul să ștergeți clienți" });
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

  // ============ HEALTH CHECK ============
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============ FACEBOOK LEAD WEBHOOK ============
  // Verification endpoint for Facebook Webhooks (Lead Ads)
  app.get("/api/facebook/lead", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
      if (typeof challenge === "string" || typeof challenge === "number") {
        return res.status(200).send(challenge.toString());
      }
      return res.status(200).send("");
    }

    return res.sendStatus(403);
  });

  // Receive lead notifications (we vom completa logica de creare client mai târziu)
  app.post("/api/facebook/lead", async (req: Request, res: Response) => {
    try {
      // Pentru început doar confirmăm recepția, ca Facebook să considere webhook-ul valid
      // Vom adăuga ulterior integrarea completă (Graph API → createClient).
      console.log("Received Facebook lead webhook:", JSON.stringify(req.body));
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Facebook lead webhook error:", error);
      res.sendStatus(500);
    }
  });

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

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Eroare la salvarea sesiunii" });
        }
        const { passwordHash, ...safeUser } = user;
        res.json({ user: safeUser });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Eroare la autentificare: " + errorMessage });
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
        req.session.destroy(() => { });
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

  // Lightweight list of agents (for filters, chat) - accesibilă tuturor utilizatorilor autentificați
  app.get("/api/users/agents", requireAuth, async (_req: AuthRequest, res: Response) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(and(eq(users.active, true), inArray(users.role, ["AGENT", "ADMIN"])));

      res.json(rows);
    } catch (error) {
      console.error("Get agent users error:", error);
      res.status(500).json({ message: "Eroare la încărcarea agenților" });
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
      const agentId = !isAdminOrOana(req) ? req.userId : (req.query.agentId as string | undefined);
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const [clientStats, activeAgentsCount] = await Promise.all([
        storage.getClientStats(agentId, dateFrom, dateTo),
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

  // Dashboard stats for today only (ziua curentă, actualizare în timp real)
  app.get("/api/dashboard/today", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = !isAdminOrOana(req) ? req.userId : (req.query.agentId as string | undefined);
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const stats = await storage.getDashboardTodayStats(agentId, dayStart, dayEnd);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard today error:", error);
      res.status(500).json({ message: "Eroare la încărcarea statisticilor pentru azi" });
    }
  });

  // Get agents list (for filters)
  app.get("/api/dashboard/agents", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Non-admins can only see themselves
      if (!isAdminOrOana(req)) {
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

  // Profit operațional + Comision RON pentru cei 4 agenți (carduri dashboard + leaderboard)
  const DASHBOARD_PROFIT_AGENT_NAMES = ["alexandru croitoru", "marian costache", "oana", "razvan rosu"];
  const isDashboardProfitAgent = (name: string) => {
    const n = (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return DASHBOARD_PROFIT_AGENT_NAMES.some((key) => n.includes(key));
  };
  app.get("/api/dashboard/profit-comision", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const luna = req.query.luna ? parseInt(req.query.luna as string) : new Date().getMonth() + 1;
      const an = req.query.an ? parseInt(req.query.an as string) : new Date().getFullYear();
      const report = await storage.getFinancialReport(luna, an);
      const all = (report?.agentsMetrics || []) as { id: string; name: string; profitOperational: number; comisionValoare: number }[];
      const agents = all.filter((m) => isDashboardProfitAgent(m.name));

      if (!isAdminOrOana(req)) {
        const user = await storage.getUser(req.userId!);
        if (!user) return res.status(403).json({ message: "Acces interzis" });
        const fullName = `${(user.firstName || "").trim()} ${(user.lastName || "").trim()}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const allowed = DASHBOARD_PROFIT_AGENT_NAMES.some((key) => fullName.includes(key));
        if (!allowed) return res.status(403).json({ message: "Acces doar pentru agenții configurați" });
      }

      res.json({ agents });
    } catch (error) {
      console.error("Dashboard profit-comision error:", error);
      res.status(500).json({ message: "Eroare la încărcarea datelor" });
    }
  });

  // ---------- CRM Chat ----------
  app.get("/api/chat/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      if (isAdminOrOana(req) && req.query.all === "1") {
        const list = await storage.getAllConversationsAdmin();
        return res.json(list);
      }
      const list = await storage.getConversationsForUser(userId);
      res.json(list);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Eroare la încărcarea conversațiilor" });
    }
  });

  app.get("/api/chat/messages", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const withUserId = req.query.withUserId as string;
      const user1 = req.query.user1 as string;
      const user2 = req.query.user2 as string;
      if (isAdminOrOana(req) && user1 && user2) {
        const messages = await storage.getCrmMessagesBetween(user1, user2);
        return res.json(messages);
      }
      if (!withUserId) return res.status(400).json({ message: "withUserId este obligatoriu" });
      const messages = await storage.getCrmMessagesBetween(userId, withUserId);
      await storage.markCrmMessagesAsRead(userId, withUserId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Eroare la încărcarea mesajelor" });
    }
  });

  app.post("/api/chat/messages", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { recipientId, body } = req.body as { recipientId?: string; body?: string };
      if (!recipientId || body == null || String(body).trim() === "")
        return res.status(400).json({ message: "recipientId și body sunt obligatorii" });
      const msg = await storage.createCrmMessage(userId, recipientId, String(body).trim());
      res.status(201).json(msg);
    } catch (error) {
      console.error("Post message error:", error);
      res.status(500).json({ message: "Eroare la trimiterea mesajului" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const unreadCount = await storage.getUnreadMessageCount(userId);
      const conversations = await storage.getConversationsForUser(userId);
      const recentMessages = conversations
        .filter((c) => c.lastMessage != null)
        .slice(0, 10)
        .map((c) => ({
          type: "message" as const,
          from: `${c.firstName} ${c.lastName}`,
          fromUserId: c.userId,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
        }));
      const recentLeadsTodayOnly = req.query.recentLeadsTodayOnly === "1" || req.query.recentLeadsTodayOnly === "true";
      const recentLeads = await storage.getRecentLeadsForNotifications(15, recentLeadsTodayOnly);
      res.json({
        unreadMessages: unreadCount,
        recentMessages,
        recentLeads: recentLeads.map((l) => ({
          id: l.id,
          nume: l.nume,
          sursa: l.sursa,
          dataAdaugare: l.dataAdaugare,
          dataOfertarii: l.dataOfertarii,
        })),
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Eroare la încărcarea notificărilor" });
    }
  });

  // Get activity summary for agent
  app.get("/api/activity/summary", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, from, to } = req.query;

      // Non-admins can only see their own activity
      let filterAgentId = agentId as string | undefined;
      if (!isAdminOrOana(req)) {
        filterAgentId = req.userId;
      }

      if (!filterAgentId) {
        return res.status(400).json({ message: "Agent ID este obligatoriu" });
      }

      if (!from || !to) {
        return res.status(400).json({ message: "Perioada (from/to) este obligatorie" });
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Date invalide pentru perioadă" });
      }

      // Set to end of day for 'to' date
      toDate.setHours(23, 59, 59, 999);

      const summary = await storage.getAgentActivitySummary({
        agentId: filterAgentId,
        from: fromDate,
        to: toDate,
      });

      res.json(summary);
    } catch (error) {
      console.error("Get activity summary error:", error);
      res.status(500).json({ message: "Eroare la încărcarea raportului de activitate" });
    }
  });

  // Get detailed activity log (per client/action) for agent
  app.get("/api/activity/details", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, from, to, ownerAgentId } = req.query;

      // Non-admins can only see propriile lor activități
      let filterAgentId = agentId as string | undefined;
      if (!isAdminOrOana(req)) {
        filterAgentId = req.userId;
      }

      if (!filterAgentId) {
        return res.status(400).json({ message: "Agent ID este obligatoriu" });
      }

      if (!from || !to) {
        return res.status(400).json({ message: "Perioada (from/to) este obligatorie" });
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Date invalide pentru perioadă" });
      }

      // Set to end of day pentru data de final
      toDate.setHours(23, 59, 59, 999);

      const details = await storage.getAgentActivityDetails({
        agentId: filterAgentId,
        from: fromDate,
        to: toDate,
        ownerAgentId: ownerAgentId as string | undefined,
      });

      res.json(details);
    } catch (error) {
      console.error("Get activity details error:", error);
      res.status(500).json({ message: "Eroare la încărcarea detaliilor de activitate" });
    }
  });

  // ============ CLIENT ROUTES ============

  // Get all clients
  app.get("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, stadiuOferta, search, underObservation, dateFrom, dateTo } = req.query;

      const requestedAgentId = agentId as string | undefined;

      // Non-admins pot vedea doar propriii clienți,
      // cu excepția lui Razvan (poate filtra Alexandru) și Oana (poate filtra orice agent).
      let filterAgentId = requestedAgentId;
      if (!isAdminOrOana(req)) {
        const isRazvan =
          !!req.userEmail?.toLowerCase().includes("razvan") ||
          !!req.userFirstName?.toLowerCase().includes("razvan");
        const isOana =
          !!req.userEmail?.toLowerCase().includes("oana") ||
          !!req.userFirstName?.toLowerCase().includes("oana");

        if (isOana) {
          // Oana: poate selecta orice agent și vede doar clienții acelui agent; "all" = toți clienții
          filterAgentId = requestedAgentId === "all" || !requestedAgentId ? undefined : requestedAgentId;
        } else if (isRazvan) {
          // Dacă Razvan nu a ales un agent explicit, vede propriii clienți
          filterAgentId = requestedAgentId || req.userId;
        } else {
          filterAgentId = req.userId;
        }
      }

      const clients = await storage.getAllClients({
        agentId: filterAgentId,
        stadiuOferta: stadiuOferta as string | undefined,
        search: search as string | undefined,
        underObservation: underObservation === "true" ? true : underObservation === "false" ? false : undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });

      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Eroare la încărcarea clienților" });
    }
  });

  // Get follow-ups for a specific date (Follow-up Azi)
  app.get("/api/followups", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, date } = req.query;

      let filterAgentId = agentId as string | undefined;
      if (!isAdminOrOana(req)) {
        filterAgentId = req.userId;
      } else if (filterAgentId === "all") {
        filterAgentId = undefined;
      }

      const parseYmd = (v: string): Date | null => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
        return isNaN(dt.getTime()) ? null : dt;
      };

      const dateStr = (date as string | undefined) || "";
      const targetDate = date
        ? (parseYmd(dateStr) || new Date(dateStr))
        : new Date();
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Dată invalidă" });
      }

      const clients = await storage.getFollowupsForDate(filterAgentId, targetDate);
      res.json(clients);
    } catch (error) {
      console.error("Get followups error:", error);
      res.status(500).json({ message: "Eroare la încărcarea follow-up-urilor" });
    }
  });

  // Get client stats
  app.get("/api/clients/stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const agentId = !isAdminOrOana(req) ? req.userId : (req.query.agentId as string | undefined);
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
      // (Razvan/Oana pot vedea orice — ca la PATCH — ca refetch-ul la edit să meargă)
      const isRazvan =
        !!req.userEmail?.toLowerCase().includes("razvan") ||
        !!req.userFirstName?.toLowerCase().includes("razvan");
      const isOanaUser =
        !!req.userEmail?.toLowerCase().includes("oana") ||
        !!req.userFirstName?.toLowerCase().includes("oana");
      if (!isAdminOrOana(req) && !isRazvan && !isOanaUser && client.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți acces la acest client" });
      }

      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ message: "Eroare la încărcarea clientului" });
    }
  });

  // Istoric activitate client (implicit: schimbări fișiere ofertă)
  app.get("/api/clients/:id/activity", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      const isRazvan =
        !!req.userEmail?.toLowerCase().includes("razvan") ||
        !!req.userFirstName?.toLowerCase().includes("razvan");
      const isOana =
        !!req.userEmail?.toLowerCase().includes("oana") ||
        !!req.userFirstName?.toLowerCase().includes("oana");

      if (!isAdminOrOana(req) && !isRazvan && !isOana && client.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți acces la acest client" });
      }

      const typeParam = typeof req.query.type === "string" ? req.query.type : "OFFER_FILE_CHANGE";
      const types = typeParam === "all"
        ? undefined
        : typeParam.split(",").map((t) => t.trim()).filter(Boolean) as any[];

      const logs = await storage.getClientActivityLogs(req.params.id, types);
      res.json(logs);
    } catch (error) {
      console.error("Get client activity error:", error);
      res.status(500).json({ message: "Eroare la încărcarea istoricului" });
    }
  });

  // Register phone click (call attempt) on client
  app.post("/api/clients/:id/phone-click", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.userId) {
        return res.status(401).json({ message: "Neautorizat" });
      }

      await storage.registerClientCall(id, req.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Register client call error:", error);
      res.status(500).json({ message: "Eroare la înregistrarea apelului" });
    }
  });

  // Create client
  app.post("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const data = createClientSchema.parse(req.body);

      // RBAC: Non-admins can only create clients assigned to themselves
      if (!isAdminOrOana(req)) {
        data.agentId = req.userId;
      } else if (!data.agentId) {
        // Admin creates without agent - leave unassigned
        data.agentId = undefined;
      }

      // Rezolvă partnerId: poate fi UUID existent, sau nume partener (caută / creează)
      if (data.isPartnerOrder && data.partnerId) {
        const resolvedId = await storage.getOrCreatePartnerId(data.partnerId);
        data.partnerId = resolvedId ?? undefined;
      }

      const client = await storage.createClient(data);

      // Log manual lead creation
      if (client.agentId && req.userId) {
        await storage.createActivityLog({
          userId: client.agentId,
          clientId: client.id,
          type: "LEAD_MANUAL",
        });
      }

      // Auto-recalculate profitability if client is LIVRAT with an agent
      if (client.stadiuOferta === "VANDUT" && client.stadiuComanda === "LIVRAT" && client.agentId && client.dataLivrarii) {
        const deliveryDate = new Date(client.dataLivrarii);
        const luna = deliveryDate.getUTCMonth() + 1;
        const an = deliveryDate.getFullYear();
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

      const isRazvan =
        !!req.userEmail?.toLowerCase().includes("razvan") ||
        !!req.userFirstName?.toLowerCase().includes("razvan");
      const isOana =
        !!req.userEmail?.toLowerCase().includes("oana") ||
        !!req.userFirstName?.toLowerCase().includes("oana");

      // Non-admins pot modifica doar propriii clienți,
      // cu excepția lui Razvan și Oana care pot edita orice client.
      if (!isAdminOrOana(req) && !isRazvan && !isOana && existingClient.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți permisiunea să modificați acest client" });
      }

      const data = updateClientSchema.parse(req.body);
      const body = req.body as Record<string, unknown>;

      // Nu permite golirea accidentală a niciunui câmp deja completat (orice user / orice cont)
      const safeData = protectClientUpdateFromAccidentalClear(existingClient, data, body);

      // Golire fișiere ofertă: aceleași drepturi ca la ștergerea clientului
      const clearsOfferFile = (
        field: "ofertaFilename" | "ofertaFilename2" | "ofertaFilename3",
      ) => {
        const next = safeData[field];
        const had = !!(existingClient as any)[field];
        return (
          had &&
          next !== undefined &&
          (next === "" || next === null)
        );
      };
      if (
        clearsOfferFile("ofertaFilename") ||
        clearsOfferFile("ofertaFilename2") ||
        clearsOfferFile("ofertaFilename3")
      ) {
        if (
          !canUserDeleteClients({
            role: req.userRole || "",
            firstName: req.userFirstName,
            lastName: req.userLastName,
            specialKey: req.specialKey,
          })
        ) {
          return res.status(403).json({
            message: "Nu aveți dreptul să ștergeți fișierele de ofertă",
          });
        }
      }

      // RBAC: Non-admins cannot change the agent assignment
      if (!isAdminOrOana(req)) {
        delete safeData.agentId;
      }

      // Rezolvă partnerId la edit (id sau nume → id)
      if (data.partnerId !== undefined && data.partnerId !== null && data.partnerId !== "") {
        const resolvedId = await storage.getOrCreatePartnerId(data.partnerId);
        safeData.partnerId = resolvedId ?? undefined;
      }

      // Track status changes and follow-up clicks
      const oldStatus = existingClient.stadiuOferta;
      const oldFollowUp1 = existingClient.followUpEfectuat1;
      const oldFollowUp2 = existingClient.followUpEfectuat2;
      const oldFollowUp3 = existingClient.followUpEfectuat3;
      const oldOffer1 = existingClient.ofertaFilename || null;
      const oldOffer2 = existingClient.ofertaFilename2 || null;
      const oldOffer3 = (existingClient as any).ofertaFilename3 || null;

      const client = await storage.updateClient(req.params.id, safeData);

      // Log status change
      if (client && safeData.stadiuOferta && safeData.stadiuOferta !== oldStatus && client.agentId && req.userId) {
        await storage.createActivityLog({
          userId: client.agentId,
          clientId: client.id,
          type: "STATUS_CHANGE",
          meta: { from: oldStatus, to: safeData.stadiuOferta },
        });
      }

      // Log offer file changes (upload / replace / clear via form save)
      if (client && req.userId) {
        const offerFields: Array<{
          key: "ofertaFilename" | "ofertaFilename2" | "ofertaFilename3";
          slot: 1 | 2 | 3;
          oldPath: string | null;
        }> = [
          { key: "ofertaFilename", slot: 1, oldPath: oldOffer1 },
          { key: "ofertaFilename2", slot: 2, oldPath: oldOffer2 },
          { key: "ofertaFilename3", slot: 3, oldPath: oldOffer3 },
        ];

        for (const field of offerFields) {
          if ((safeData as any)[field.key] === undefined) continue;
          const nextRaw = (safeData as any)[field.key];
          const nextPath = nextRaw ? String(nextRaw) : null;
          if (nextPath === field.oldPath) continue;

          const action = !field.oldPath && nextPath
            ? "upload"
            : field.oldPath && !nextPath
              ? "clear"
              : "replace";

          await storage.createActivityLog({
            userId: req.userId,
            clientId: client.id,
            type: "OFFER_FILE_CHANGE",
            meta: {
              slot: field.slot,
              field: field.key,
              action,
              from: field.oldPath,
              to: nextPath,
              byName: [req.userFirstName, req.userLastName].filter(Boolean).join(" ").trim() || null,
            },
          });
        }
      }

      // Log follow-up clicks
      if (client && client.agentId && req.userId) {
        if (safeData.followUpEfectuat1 && !oldFollowUp1) {
          await storage.createActivityLog({
            userId: client.agentId,
            clientId: client.id,
            type: "FOLLOWUP_CLICK",
            meta: { followUpNumber: 1 },
          });
        }
        if (safeData.followUpEfectuat2 && !oldFollowUp2) {
          await storage.createActivityLog({
            userId: client.agentId,
            clientId: client.id,
            type: "FOLLOWUP_CLICK",
            meta: { followUpNumber: 2 },
          });
        }
        if (safeData.followUpEfectuat3 && !oldFollowUp3) {
          await storage.createActivityLog({
            userId: client.agentId,
            clientId: client.id,
            type: "FOLLOWUP_CLICK",
            meta: { followUpNumber: 3 },
          });
        }
      }

      // Auto-recalculate profitability when relevant fields change (strict by DATA LIVRĂRII)
      const oldIncluded =
        existingClient.stadiuOferta === "VANDUT" &&
        existingClient.stadiuComanda === "LIVRAT" &&
        !!existingClient.agentId &&
        !!existingClient.dataLivrarii;
      const newIncluded =
        client?.stadiuOferta === "VANDUT" &&
        client?.stadiuComanda === "LIVRAT" &&
        !!client?.agentId &&
        !!client?.dataLivrarii;

      // Recalculate for old agent/month if it was included before (to subtract it)
      if (oldIncluded) {
        const oldDeliveryDate = new Date(existingClient.dataLivrarii!);
        const oldLuna = oldDeliveryDate.getUTCMonth() + 1;
        const oldAn = oldDeliveryDate.getFullYear();
        await storage.recomputeAgentMonthlyProfit(existingClient.agentId!, oldAn, oldLuna);
      }

      // Recalculate for new agent/month if it is included now (to add/update it)
      if (newIncluded) {
        const newDeliveryDate = new Date(client!.dataLivrarii!);
        const newLuna = newDeliveryDate.getUTCMonth() + 1;
        const newAn = newDeliveryDate.getFullYear();
        const oldDeliveryTime = existingClient.dataLivrarii
          ? new Date(existingClient.dataLivrarii).getTime()
          : null;
        const newDeliveryTime = new Date(client!.dataLivrarii!).getTime();

        // Only recalculate if it's different from what we just recalculated
        if (
          !oldIncluded ||
          existingClient.agentId !== client!.agentId ||
          oldDeliveryTime !== newDeliveryTime
        ) {
          await storage.recomputeAgentMonthlyProfit(client!.agentId!, newAn, newLuna);
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

  // Toggle client observation (admin only) - add/remove client from "Urmăriri clienți"
  app.post("/api/clients/:id/toggle-observation", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existingClient = await storage.getClient(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      const newValue = !existingClient.underObservation;
      const updated = await storage.updateClient(id, { underObservation: newValue });

      res.json({
        success: true,
        underObservation: updated?.underObservation ?? newValue,
      });
    } catch (error) {
      console.error("Toggle client observation error:", error);
      res.status(500).json({ message: "Eroare la actualizarea observației clientului" });
    }
  });

  // Delete client: doar conturi desemnate (vezi canUserDeleteClients)
  app.delete("/api/clients/:id", requireAuth, requireClientDeletePermission, async (req: AuthRequest, res: Response) => {
    try {
      // Get client before deletion for profitability recalculation
      const existingClient = await storage.getClient(req.params.id);

      const deleted = await storage.deleteClient(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "Client negăsit" });
      }

      // Recalculate profitability if deleted client was included in LIVRAT month metrics
      if (
        existingClient?.stadiuOferta === "VANDUT" &&
        existingClient?.stadiuComanda === "LIVRAT" &&
        existingClient.agentId &&
        existingClient.dataLivrarii
      ) {
        const deliveryDate = new Date(existingClient.dataLivrarii);
        const luna = deliveryDate.getUTCMonth() + 1;
        const an = deliveryDate.getFullYear();
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

  // ============ TASK / PROIECTE ROUTES ============

  app.get("/api/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { assignedAgentId, createdById } = req.query;
      const filters: { assignedAgentId?: string; createdById?: string } = {};
      if (assignedAgentId && assignedAgentId !== "all") filters.assignedAgentId = assignedAgentId as string;
      if (createdById && createdById !== "all") filters.createdById = createdById as string;
      const taskList = await storage.getAllTasks(filters);
      res.json(taskList);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ message: "Eroare la încărcarea task-urilor" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const body = { ...req.body, createdById: req.body.createdById || req.userId };
      const data = createTaskSchema.parse(body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create task error:", error);
      res.status(500).json({ message: "Eroare la crearea task-ului" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const existing = await storage.getTask(req.params.id);
      if (!existing) return res.status(404).json({ message: "Task negăsit" });
      if (req.userRole !== "ADMIN" && existing.createdById !== req.userId && existing.assignedAgentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți permisiunea să modificați acest task" });
      }
      const data = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, data);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update task error:", error);
      res.status(500).json({ message: "Eroare la actualizarea task-ului" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const existing = await storage.getTask(req.params.id);
      if (!existing) return res.status(404).json({ message: "Task negăsit" });
      if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
        return res.status(403).json({ message: "Nu aveți permisiunea să ștergeți acest task" });
      }
      const deleted = await storage.deleteTask(req.params.id);
      res.json({ deleted: !!deleted });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ message: "Eroare la ștergerea task-ului" });
    }
  });

  // ============ DOCUMENTAȚIE ROUTES ============

  app.get("/api/documente", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const isAdmin = isAdminOrOana(req);
      let categorie = req.query.categorie as string | undefined;
      // Non-admin: acces doar la Fișă tehnică
      if (!isAdmin) {
        categorie = "FISA_TEHNICA";
      }
      const list = await storage.getDocumente(categorie ? { categorie } : undefined);
      res.json(list);
    } catch (error) {
      console.error("Get documente error:", error);
      res.status(500).json({ message: "Eroare la încărcarea documentelor" });
    }
  });

  app.post("/api/documente", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = createDocumentSchema.parse(req.body);
      const doc = await storage.createDocument({
        ...data,
        uploadedById: req.userId ?? undefined,
      });
      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create document error:", error);
      res.status(500).json({ message: "Eroare la salvarea documentului" });
    }
  });

  app.delete("/api/documente/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      res.json({ deleted: !!deleted });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "Eroare la ștergerea documentului" });
    }
  });

  // ============ TARGET ROUTES ============

  // Get all targets
  app.get("/api/targets", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an } = req.query;

      // Non-admins can only see their own targets
      const filters: any = {};
      if (!isAdminOrOana(req)) {
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
      const targetAgentId = !isAdminOrOana(req) ? req.userId! : (agentId as string || req.userId!);
      const targetLuna = parseInt(luna as string) || new Date().getMonth() + 1;
      const targetAn = parseInt(an as string) || new Date().getFullYear();

      const progress = await storage.getTargetProgress(targetAgentId, targetLuna, targetAn);
      res.json(progress);
    } catch (error) {
      console.error("Get target progress error:", error);
      res.status(500).json({ message: "Eroare la încărcarea progresului" });
    }
  });

  // Get targets list with progress summary (for list page: % per target)
  app.get("/api/targets/with-progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an } = req.query;
      const filters: { agentId?: string; luna?: number; an?: number } = {};
      if (!isAdminOrOana(req)) {
        filters.agentId = req.userId!;
      } else if (agentId && agentId !== "all") {
        filters.agentId = agentId as string;
      }
      if (luna) filters.luna = parseInt(luna as string);
      if (an) filters.an = parseInt(an as string);

      const list = await storage.getAllTargets(filters);
      const withProgress = await Promise.all(
        list.map(async (t) => {
          const { target, progress } = await storage.getTargetDetailedProgress(t.id);
          const targetVanzari = target ? parseFloat(target.targetVanzari) : 0;

          // 1) Vânzări RON – procent brut, fără rotunjire intermediară, doar limitat la 100
          const pctVanzari =
            targetVanzari > 0 ? Math.min(100, (progress.realizedValue / targetVanzari) * 100) : 0;

          // 2) Clienți
          const pctClienti =
            target && target.targetClienti > 0
              ? Math.min(100, ((progress.realizedVanzariNr || 0) / target.targetClienti) * 100)
              : 0;

          // 3) Oferte transmise
          const pctOferte =
            target && target.targetOferteTransmise > 0
              ? Math.min(
                  100,
                  ((progress.realizedOferteTransmise || 0) / target.targetOferteTransmise) * 100
                )
              : 0;

          // 4) Follow-up-uri
          const pctFollowUp =
            target && target.targetFollowUp > 0
              ? Math.min(100, ((progress.realizedFollowUp || 0) / target.targetFollowUp) * 100)
              : 0;

          // 5) Clienți noi
          const pctClientiNoi =
            target && target.targetClientiNoi > 0
              ? Math.min(100, ((progress.realizedClientiNoi || 0) / target.targetClientiNoi) * 100)
              : 0;

          // 6) Colaboratori noi
          const pctColaboratoriNoi =
            target && target.targetColaboratoriNoi > 0
              ? Math.min(
                  100,
                  ((progress.realizedColaboratoriNoi || 0) / target.targetColaboratoriNoi) * 100
                )
              : 0;

          // 7) Partener activ
          const pctPartenerActiv =
            target && target.targetPartenerActiv > 0
              ? Math.min(
                  100,
                  ((progress.realizedPartenerActiv || 0) / target.targetPartenerActiv) * 100
                )
              : 0;

          // 8) Conversie (%)
          const targetConversie =
            target && target.targetConversie ? parseFloat(target.targetConversie) : 0;
          const realizedConversie = progress.realizedConversie ?? 0;
          const pctConversie =
            targetConversie > 0
              ? Math.min(100, (realizedConversie / targetConversie) * 100)
              : 0;

          const percents = [
            pctVanzari,
            pctClienti,
            pctOferte,
            pctFollowUp,
            pctClientiNoi,
            pctColaboratoriNoi,
            pctPartenerActiv,
            pctConversie,
          ];

          const avg =
            percents.reduce((sum, v) => sum + v, 0) / (percents.length || 1);

          // Păstrăm o singură rotunjire finală pentru afișare (1 zecimală)
          const percentVanzariDisplay =
            targetVanzari > 0 ? Math.min(100, Math.round(pctVanzari * 10) / 10) : 0;
          const percentTotal = Math.min(100, Math.round(avg * 10) / 10);

          return {
            ...t,
            progressSummary: {
              realizedValue: progress.realizedValue,
              targetVanzari,
              percentVanzari: percentVanzariDisplay,
              percentTotal,
            },
          };
        })
      );
      res.json(withProgress);
    } catch (error) {
      console.error("Get targets with progress error:", error);
      res.status(500).json({ message: "Eroare la încărcarea target-urilor cu progres" });
    }
  });

  // Get full detailed progress for one target (for "Detalii" dialog)
  app.get("/api/targets/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const detailed = await storage.getTargetDetailedProgress(id);
      if (!detailed.target) {
        return res.status(404).json({ message: "Target negăsit" });
      }
      if (!isAdminOrOana(req) && detailed.target.agentId !== req.userId) {
        return res.status(403).json({ message: "Nu aveți acces la acest target" });
      }
      res.json(detailed);
    } catch (error) {
      console.error("Get target detailed progress error:", error);
      res.status(500).json({ message: "Eroare la încărcarea detaliilor progresului" });
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

  // Create partner
  // Admin: poate crea parteneri deja activi
  // Agent: poate propune parteneri (activ=false), apoi adminul îi aprobă
  app.post("/api/partners", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const data = createPartnerSchema.parse(req.body);
      const isAdmin = isAdminOrOana(req);

      const partner = await storage.createPartner({
        ...data,
        // Agenții nu pot crea direct parteneri activi
        activ: isAdmin ? (data as any).activ ?? true : false,
      } as any);
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

  // Get all subcategories (level 2) – pentru filtru subcategorie independent de categorie
  app.get("/api/expense-categories/sub", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const categories = await storage.getExpenseCategoriesByLevel("sub");
      res.json(categories);
    } catch (error) {
      console.error("Get all subcategories error:", error);
      res.status(500).json({ message: "Eroare la încărcarea subcategoriilor" });
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

  // ============ CHELTUIELI ROUTES ============

  // Lista tuturor angajaților pentru Cheltuieli (nu doar agenți) – admin
  app.get("/api/cheltuieli/angajati", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const all = await storage.getAllUsers();
      const active = all.filter((u: { active?: boolean }) => u.active !== false);
      active.sort((a: { firstName: string; lastName: string }, b: { firstName: string; lastName: string }) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      res.json(active);
    } catch (error) {
      console.error("Get angajati for cheltuieli error:", error);
      res.status(500).json({ message: "Eroare la încărcarea angajaților" });
    }
  });

  // ============ CHELTUIELI AGENT ROUTES ============

  // Get all cheltuieli agent
  app.get("/api/cheltuieli-agent", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an, categoryId, sediuId, firma } = req.query;

      // Non-admins can only see their own expenses
      const filters: any = {};
      if (!isAdminOrOana(req)) {
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
      if (!isAdminOrOana(req)) {
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
      if (!isAdminOrOana(req) && cheltuiala.agentId !== req.userId) {
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

      // Caz special: distribuim cheltuiala la toate showroom-urile în mod egal
      if (data.sediuId === "__ALL_SHOWROOMS__") {
        const sediiList = await storage.getAllSedii(true);
        const showrooms = sediiList.filter((s) => s.nume.toLowerCase().includes("showroom"));

        if (showrooms.length === 0) {
          return res.status(400).json({ message: "Nu există showroom-uri configurate pentru distribuire." });
        }

        const total = parseFloat(data.suma);
        const per = total / showrooms.length;

        const created: any[] = [];
        let remaining = total;
        showrooms.forEach((s, index) => {
          let suma = per;
          if (index === showrooms.length - 1) {
            suma = remaining;
          } else {
            remaining -= per;
          }

          created.push(
            storage.createCheltuialaAgent({
              ...data,
              sediuId: s.id,
              suma: suma.toFixed(2),
            } as any),
          );
        });

        const results = await Promise.all(created);
        return res.status(201).json(results);
      }

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
            descriere: `Import: ${row["Tip Cheltuiala"] || ""} - ${row["Cheltuieli Showroom"] || row["Cheltuieli Auto"] || ""} `.trim(),
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
            affectedMonths.add(`${agentId}:${dateInfo.an}:${dateInfo.luna} `);
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

  // Get showroom profitability costs aggregated by category for a specific month
  app.get("/api/profitabilitate/showroom-costs", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { luna, an } = req.query;

      if (!luna || !an) {
        return res.status(400).json({ message: "Luna și anul sunt obligatorii" });
      }

      const lunaNum = parseInt(luna as string);
      const anNum = parseInt(an as string);

      const result = await storage.getShowroomProfitabilityCosts(lunaNum, anNum);
      res.json(result);
    } catch (error) {
      console.error("Get showroom profitability costs error:", error);
      res.status(500).json({ message: "Eroare la încărcarea costurilor showroom" });
    }
  });

  // Get showroom costs distributed to agents for a specific month
  app.get("/api/profitabilitate/showroom-costs-distributed", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { luna, an } = req.query;

      if (!luna || !an) {
        return res.status(400).json({ message: "Luna și anul sunt obligatorii" });
      }

      const lunaNum = parseInt(luna as string);
      const anNum = parseInt(an as string);

      const result = await storage.getShowroomCostsDistributedToAgents(lunaNum, anNum);
      res.json(result);
    } catch (error) {
      console.error("Get showroom costs distributed error:", error);
      res.status(500).json({ message: "Eroare la încărcarea costurilor distribuite" });
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

  // Get financial report for a range of months
  app.get("/api/financial/report", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { luna, an, endLuna } = req.query;

      if (!luna || !an) {
        return res.status(400).json({ message: "Luna și anul sunt obligatorii" });
      }

      const report = await storage.getFinancialReport(
        parseInt(luna as string),
        parseInt(an as string),
        endLuna ? parseInt(endLuna as string) : undefined
      );

      res.json(report);
    } catch (error) {
      console.error("Get financial report error:", error);
      res.status(500).json({ message: "Eroare la generarea raportului" });
    }
  });

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
          agentName: `${agent.firstName} ${agent.lastName} `,
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

  // Get clients included in an agent's profitability for a period
  app.get("/api/profitabilitate/sales/:agentId/clients", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const startMonth = parseInt(req.query.startMonth as string) || 1;
      const endMonth = parseInt(req.query.endMonth as string) || startMonth;

      const data = await storage.getAgentProfitabilityClients(agentId, an, startMonth, endMonth);
      res.json(data);
    } catch (error) {
      console.error("Get agent profitability clients error:", error);
      res.status(500).json({ message: "Eroare la încărcarea clienților pentru profitabilitate" });
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
          agentName: `${agent.firstName} ${agent.lastName} `,
          ...profitResult
        });
      }

      res.json(results);
    } catch (error) {
      console.error("Recalculate all agents profitability error:", error);
      res.status(500).json({ message: "Eroare la recalcularea profitabilității" });
    }
  });

  // ============ MANUAL ACQUISITIONS ROUTES ============

  // Get all manual acquisitions for a year
  app.get("/api/profitabilitate/achizitii-manuale", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const data = await storage.getAllAgentsManualAchizitii(an);
      res.json(data);
    } catch (error) {
      console.error("Get manual acquisitions error:", error);
      res.status(500).json({ message: "Eroare la obținerea achizițiilor manuale" });
    }
  });

  // Get manual acquisitions for a specific agent
  app.get("/api/profitabilitate/achizitii-manuale/:agentId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const data = await storage.getAgentManualAchizitii(agentId, an);
      res.json(data);
    } catch (error) {
      console.error("Get agent manual acquisitions error:", error);
      res.status(500).json({ message: "Eroare la obținerea achizițiilor manuale" });
    }
  });

  // Upsert manual acquisition (create or update)
  app.post("/api/profitabilitate/achizitii-manuale", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an, achizitieGard, achizitieAcoperis } = req.body;

      if (!agentId || !luna || !an) {
        return res.status(400).json({ message: "agentId, luna și an sunt obligatorii" });
      }

      const result = await storage.upsertAgentManualAchizitii({
        agentId,
        luna,
        an,
        achizitieGard,
        achizitieAcoperis
      });
      res.json(result);
    } catch (error) {
      console.error("Upsert manual acquisition error:", error);
      res.status(500).json({ message: "Eroare la salvarea achiziției manuale" });
    }
  });

  // ============ AGENT FIXED COSTS ROUTES ============

  // Get all agents fixed costs for a year
  app.get("/api/profitabilitate/cheltuieli-fixe", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const data = await storage.getAllAgentsFixedCosts(an);
      res.json(data);
    } catch (error) {
      console.error("Get fixed costs error:", error);
      res.status(500).json({ message: "Eroare la obținerea cheltuielilor fixe" });
    }
  });

  // Get fixed costs for a specific agent
  app.get("/api/profitabilitate/cheltuieli-fixe/:agentId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const data = await storage.getAgentFixedCosts(agentId, an);
      res.json(data);
    } catch (error) {
      console.error("Get agent fixed costs error:", error);
      res.status(500).json({ message: "Eroare la obținerea cheltuielilor fixe" });
    }
  });

  // Upsert fixed costs (create or update)
  app.post("/api/profitabilitate/cheltuieli-fixe", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, luna, an, salariu, amortizareAuto, combustibil, revizii, alteCheltuieliAuto, abonamente, diurne, alteCheltuieli } = req.body;

      if (!agentId || !luna || !an) {
        return res.status(400).json({ message: "agentId, luna și an sunt obligatorii" });
      }

      const result = await storage.upsertAgentFixedCosts({
        agentId,
        luna,
        an,
        salariu,
        amortizareAuto,
        combustibil,
        revizii,
        alteCheltuieliAuto,
        abonamente,
        diurne,
        alteCheltuieli
      });
      res.json(result);
    } catch (error) {
      console.error("Upsert fixed costs error:", error);
      res.status(500).json({ message: "Eroare la salvarea cheltuielilor fixe" });
    }
  });

  // ============ GOOGLE SHEETS INTEGRATION ============

  app.post("/api/integrations/google-sheets/sync", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { sheetId } = req.body;
      const effectiveSheetId = sheetId || process.env.GOOGLE_SHEET_ID;

      if (!effectiveSheetId) {
        return res.status(400).json({ message: "Lipsă Sheet ID. Configurați GOOGLE_SHEET_ID sau trimiteți-l în request." });
      }

      console.log(`Starting sync from Google Sheet: ${effectiveSheetId} `);
      const sheetRows = await fetchClientsFromSheet(effectiveSheetId);

      let addedCount = 0;
      let skippedCount = 0;
      let errorsCount = 0;

      for (const row of sheetRows) {
        try {
          // Check for existing phone number to avoid duplicates
          // Normalize phone: remove spaces, dashes, etc. if needed, but strict match for now
          const existing = await db.select().from(clients).where(eq(clients.telefon, row.telefon)).limit(1);

          if (existing.length > 0) {
            skippedCount++;
            continue;
          }

          await db.insert(clients).values({
            nume: row.nume,
            telefon: row.telefon,
            sursa: "FACEBOOK", // Default per user request
            stadiuOferta: "NOUA", // Default entry status
            agentId: req.userId, // Assign to current user (the agent clicking sync)
            dataAdaugare: new Date(),
          });
          addedCount++;
        } catch (err) {
          console.error(`Error inserting client ${row.nume}: `, err);
          errorsCount++;
        }
      }

      res.json({
        success: true,
        message: `Sincronizare completă.Adăugați: ${addedCount}, Săriți(există deja): ${skippedCount}, Erori: ${errorsCount} `,
        stats: { addedCount, skippedCount, errorsCount }
      });

    } catch (error) {
      console.error("Google Sheets Sync Error:", error);
      const msg = error instanceof Error ? error.message : "Eroare la sincronizare";
      res.status(500).json({ message: msg });
    }
  });

  // ============ SALARII NEPRODUCTIVI ROUTES ============

  // Get all salaries for non-productive employees
  app.get("/api/salarii-neproductivi", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { tipAngajat, luna, an, numeAngajat } = req.query;
      const data = await storage.getAllSalariiNeproductivi({
        tipAngajat: tipAngajat as string,
        luna: luna ? parseInt(luna as string) : undefined,
        an: an ? parseInt(an as string) : undefined,
        numeAngajat: numeAngajat as string
      });
      res.json(data);
    } catch (error) {
      console.error("Get salarii neproductivi error:", error);
      res.status(500).json({ message: "Eroare la obținerea salariilor" });
    }
  });

  // Get totals for a specific month
  app.get("/api/salarii-neproductivi/totals", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const luna = parseInt(req.query.luna as string) || new Date().getMonth() + 1;
      const an = parseInt(req.query.an as string) || new Date().getFullYear();
      const totals = await storage.getSalariiNeproductiviTotals(luna, an);
      res.json(totals);
    } catch (error) {
      console.error("Get salarii totals error:", error);
      res.status(500).json({ message: "Eroare la calcularea totalurilor" });
    }
  });

  // Get a single salary entry
  app.get("/api/salarii-neproductivi/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await storage.getSalariuNeproductiv(id);
      if (!data) {
        return res.status(404).json({ message: "Înregistrare negăsită" });
      }
      res.json(data);
    } catch (error) {
      console.error("Get salariu error:", error);
      res.status(500).json({ message: "Eroare la obținerea salariului" });
    }
  });

  // Create a salary entry
  app.post("/api/salarii-neproductivi", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { numeAngajat, tipAngajat, luna, an, salariuBrut, salariuNet, bonusuri, alteCosturi, descriere, documentUrl } = req.body;

      if (!numeAngajat || !tipAngajat || !luna || !an) {
        return res.status(400).json({ message: "Numele, tipul angajatului, luna și anul sunt obligatorii" });
      }

      if (!["PRODUCTIE", "INDIRECT"].includes(tipAngajat)) {
        return res.status(400).json({ message: "Tipul angajatului trebuie să fie PRODUCTIE sau INDIRECT" });
      }

      const result = await storage.createSalariuNeproductiv({
        numeAngajat,
        tipAngajat,
        luna,
        an,
        salariuBrut,
        salariuNet,
        bonusuri,
        alteCosturi,
        descriere,
        documentUrl
      });
      res.json(result);
    } catch (error) {
      console.error("Create salariu error:", error);
      res.status(500).json({ message: "Eroare la salvarea salariului" });
    }
  });

  // Update a salary entry
  app.put("/api/salarii-neproductivi/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.updateSalariuNeproductiv(id, req.body);
      if (!result) {
        return res.status(404).json({ message: "Înregistrare negăsită" });
      }
      res.json(result);
    } catch (error) {
      console.error("Update salariu error:", error);
      res.status(500).json({ message: "Eroare la actualizarea salariului" });
    }
  });

  // Delete a salary entry
  app.delete("/api/salarii-neproductivi/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteSalariuNeproductiv(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete salariu error:", error);
      res.status(500).json({ message: "Eroare la ștergerea salariului" });
    }
  });

  // ============ FILE UPLOAD/DOWNLOAD ROUTES ============

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  // Direct file upload endpoint for clients
  app.post("/api/files/upload", requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        console.error("[Upload API] No file in request");
        return res.status(400).json({ message: "Niciun fișier nu a fost încărcat" });
      }

      const { clientId, fileType, folder } = req.body;
      console.log(`[Upload API] Uploading ${req.file.originalname} (${req.file.size} bytes).ClientId: ${clientId}, FileType: ${fileType}, Folder: ${folder} `);

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();

      // Use folder for general uploads (cheltuieli, etc) or clientId/fileType for client files
      if (folder) {
        console.log(`[Upload API] General upload to folder: ${folder} `);
        const objectName = objectStorageService.generateObjectPath(req.file.originalname, folder);
        const objectPath = await objectStorageService.uploadFromBuffer(req.file.buffer, objectName);
        console.log(`[Upload API] General upload success: ${objectPath} `);
        return res.json({ success: true, url: objectPath, filename: req.file.originalname });
      }

      if (!clientId || !fileType) {
        console.error("[Upload API] Missing clientId or fileType");
        return res.status(400).json({ message: "clientId și fileType sunt obligatorii (sau folder pentru upload general)" });
      }

      const objectName = objectStorageService.generateObjectPath(req.file.originalname);
      console.log(`[Upload API] Uploading to object storage: ${objectName} `);
      const objectPath = await objectStorageService.uploadFromBuffer(req.file.buffer, objectName);

      const existingClient = await storage.getClient(clientId);
      const slotMap: Record<string, { field: "ofertaFilename" | "ofertaFilename2" | "ofertaFilename3"; slot: 1 | 2 | 3 }> = {
        oferta1: { field: "ofertaFilename", slot: 1 },
        oferta2: { field: "ofertaFilename2", slot: 2 },
        oferta3: { field: "ofertaFilename3", slot: 3 },
      };
      const mapped = slotMap[fileType];

      if (fileType === "oferta1") {
        console.log(`[Upload API] Updating client ${clientId} with oferta1: ${objectPath} `);
        await storage.updateClient(clientId, { ofertaFilename: objectPath });
      } else if (fileType === "oferta2") {
        console.log(`[Upload API] Updating client ${clientId} with oferta2: ${objectPath} `);
        await storage.updateClient(clientId, { ofertaFilename2: objectPath });
      } else if (fileType === "oferta3") {
        console.log(`[Upload API] Updating client ${clientId} with oferta3: ${objectPath} `);
        await storage.updateClient(clientId, { ofertaFilename3: objectPath } as any);
      }

      if (mapped && existingClient && req.userId) {
        const oldPath = ((existingClient as any)[mapped.field] as string | null) || null;
        if (oldPath !== objectPath) {
          await storage.createActivityLog({
            userId: req.userId,
            clientId,
            type: "OFFER_FILE_CHANGE",
            meta: {
              slot: mapped.slot,
              field: mapped.field,
              action: oldPath ? "replace" : "upload",
              from: oldPath,
              to: objectPath,
              originalFilename: req.file.originalname,
              byName: [req.userFirstName, req.userLastName].filter(Boolean).join(" ").trim() || null,
            },
          });
        }
      }

      console.log(`[Upload API] Client upload success: ${objectPath} `);
      res.json({ success: true, objectPath, filename: req.file.originalname });
    } catch (error) {
      console.error("[Upload API] Server Error:", error);
      res.status(500).json({ message: "Eroare la încărcarea fișierului", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Download a file
  app.get("/objects/*", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();

      const objectPath = req.path;
      console.log(`[Download API] Request for path: ${objectPath} `);
      await objectStorageService.getObjectEntityFile(objectPath);

      await objectStorageService.downloadObject(objectPath, res);
    } catch (error) {
      console.error("[Download API] Error:", error);
      const { ObjectNotFoundError } = await import("./objectStorage");
      if (error instanceof ObjectNotFoundError) {
        console.warn(`[Download API] File not found: ${req.path} `);
        return res.status(404).json({ message: "Fișierul nu a fost găsit" });
      }
      res.status(500).json({ message: "Eroare la descărcarea fișierului", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ============ EMPLOYEES ============

  app.get("/api/employees", requireAuth, async (req: AuthRequest, res) => {
    try {
      const type = req.query.type as string;
      const activeParam = req.query.active as string | undefined;
      let active: boolean | undefined = undefined;
      if (activeParam === "true") active = true;
      else if (activeParam === "false") active = false;

      const employees = await storage.getAllEmployees({ type, active });
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Eroare la obținerea angajaților" });
    }
  });

  app.post("/api/employees", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = createEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Eroare la crearea angajatului" });
    }
  });

  app.patch("/api/employees/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = updateEmployeeSchema.parse(req.body);
      const updated = await storage.updateEmployee(req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Angajat negăsit" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Eroare la actualizarea angajatului" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.json({ message: "Angajat șters cu succes" });
    } catch (error) {
      res.status(500).json({ message: "Eroare la ștergerea angajatului" });
    }
  });

  // ============ PARTNER MONTHLY DATA (DISTRIBUTORS) ============

  app.get("/api/distributors/monthly", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { partnerId, luna, an } = req.query;
      const data = await storage.getAllPartnerMonthlyData({
        partnerId: partnerId as string,
        luna: luna ? parseInt(luna as string) : undefined,
        an: an ? parseInt(an as string) : undefined
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Eroare la obținerea datelor lunare" });
    }
  });

  app.post("/api/distributors/monthly", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = createPartnerMonthlyDataSchema.parse(req.body);
      const result = await storage.upsertPartnerMonthlyData(data);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Eroare la salvarea datelor" });
    }
  });

  // ============ PARTENERI COMISIONARI (RAPORT) ============

  app.get("/api/partners/comisionari", requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await storage.getAllPartners({ tipPartener: "PARTENER_COMISIONAR", activ: true });
      res.json(list);
    } catch (error) {
      console.error("Get parteneri comisionari error:", error);
      res.status(500).json({ message: "Eroare la încărcarea partenerilor comisionari" });
    }
  });

  app.get("/api/partners/:id/comisionari-vanzari", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const luna = req.query.luna ? parseInt(req.query.luna as string) : new Date().getMonth() + 1;
      const an = req.query.an ? parseInt(req.query.an as string) : new Date().getFullYear();

      const rows = await storage.getPartnerSalesForPeriod(id, luna, an);
      res.json(rows);
    } catch (error) {
      console.error("Get partner comisionar sales error:", error);
      res.status(500).json({ message: "Eroare la încărcarea vânzărilor partenerului" });
    }
  });

  // ============ FINANCIAL REPORT ============

  app.get("/api/financial/report", requireAuth, async (req: AuthRequest, res) => {
    try {
      const luna = req.query.luna ? parseInt(req.query.luna as string) : new Date().getMonth() + 1;
      const an = req.query.an ? parseInt(req.query.an as string) : new Date().getFullYear();
      const report = await storage.getFinancialReport(luna, an);
      res.json(report);
    } catch (error) {
      console.error("Report error:", error);
      res.status(500).json({ message: "Eroare la generarea raportului financiar" });
    }
  });

  return httpServer;
}
