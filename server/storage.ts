import { 
  users, 
  clients,
  targets,
  partners,
  type User, 
  type InsertUser, 
  type SafeUser, 
  type CreateUser, 
  type UpdateUser,
  type Client,
  type CreateClient,
  type UpdateClient,
  type Target,
  type CreateTarget,
  type UpdateTarget,
  type Partner,
  type CreatePartner,
  type UpdatePartner
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: CreateUser): Promise<SafeUser>;
  updateUser(id: string, userData: UpdateUser): Promise<SafeUser | undefined>;
  getAllUsers(): Promise<SafeUser[]>;
  validatePassword(email: string, password: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;
  updateLastActivity(id: string): Promise<void>;
  changePassword(id: string, newPassword: string): Promise<void>;
  
  // Client methods
  getClient(id: string): Promise<Client | undefined>;
  getAllClients(filters?: { agentId?: string; status?: string; search?: string }): Promise<Client[]>;
  createClient(data: CreateClient): Promise<Client>;
  updateClient(id: string, data: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getClientStats(agentId?: string): Promise<{ total: number; byStatus: Record<string, number>; totalValue: number; wonValue: number; pipelineValue: number }>;
  
  // Dashboard methods
  getActiveAgentsCount(): Promise<number>;
  getAgents(): Promise<SafeUser[]>;
  getClientStatsWithPeriod(agentId?: string, startDate?: Date, endDate?: Date): Promise<{ total: number; byStatus: Record<string, number>; totalValue: number; wonValue: number; pipelineValue: number }>;
  
  // Target methods
  getTarget(id: string): Promise<Target | undefined>;
  getAllTargets(filters?: { agentId?: string; luna?: number; an?: number }): Promise<Target[]>;
  createTarget(data: CreateTarget): Promise<Target>;
  updateTarget(id: string, data: UpdateTarget): Promise<Target | undefined>;
  deleteTarget(id: string): Promise<boolean>;
  getTargetProgress(agentId: string, luna: number, an: number): Promise<{ target: Target | null; realizedValue: number; realizedClients: number }>;
  
  // Partner methods
  getPartner(id: string): Promise<Partner | undefined>;
  getAllPartners(filters?: { tipPartener?: string; activ?: boolean; search?: string }): Promise<Partner[]>;
  createPartner(data: CreatePartner): Promise<Partner>;
  updatePartner(id: string, data: UpdatePartner): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<boolean>;
}

function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: CreateUser): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "AGENT",
        specialKey: userData.specialKey,
        sediuId: userData.sediuId,
      })
      .returning();
    return toSafeUser(user);
  }

  async updateUser(id: string, userData: UpdateUser): Promise<SafeUser | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user ? toSafeUser(user) : undefined;
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(toSafeUser);
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async updateLastActivity(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActivity: new Date() })
      .where(eq(users.id, id));
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));
  }

  // ============ CLIENT METHODS ============

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getAllClients(filters?: { agentId?: string; status?: string; search?: string }): Promise<Client[]> {
    let query = db.select().from(clients);
    
    const conditions = [];
    
    if (filters?.agentId) {
      conditions.push(eq(clients.agentId, filters.agentId));
    }
    
    if (filters?.status) {
      conditions.push(eq(clients.status, filters.status as any));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(clients.nume, searchTerm),
          ilike(clients.prenume, searchTerm),
          ilike(clients.telefon, searchTerm),
          ilike(clients.email, searchTerm),
          ilike(clients.localitate, searchTerm)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(clients.createdAt));
  }

  async createClient(data: CreateClient): Promise<Client> {
    // Parse numeric and date values properly
    const parseDecimal = (val: string | undefined): string | null => {
      if (!val || val === "") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num.toString();
    };

    const parseDate = (val: string | undefined): Date | null => {
      if (!val || val === "") return null;
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    };

    const clientData: any = {
      nume: data.nume,
      prenume: data.prenume || null,
      telefon: data.telefon,
      telefonSecundar: data.telefonSecundar || null,
      email: data.email || null,
      judet: data.judet || null,
      localitate: data.localitate || null,
      adresa: data.adresa || null,
      status: data.status || "NOU",
      sursa: data.sursa || "TELEFON",
      categorie: data.categorie || "GARD",
      valoareEstimata: parseDecimal(data.valoareEstimata),
      valoareFinala: parseDecimal(data.valoareFinala),
      note: data.note || null,
      dataContact: parseDate(data.dataContact),
      dataUrmarire: parseDate(data.dataUrmarire),
      agentId: data.agentId || null,
    };

    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, data: UpdateClient): Promise<Client | undefined> {
    // Parse numeric and date values properly
    const parseDecimal = (val: string | undefined): string | null => {
      if (!val || val === "") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num.toString();
    };

    const parseDate = (val: string | undefined): Date | null => {
      if (!val || val === "") return null;
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    };

    const updateData: any = { updatedAt: new Date() };
    
    if (data.nume !== undefined) updateData.nume = data.nume;
    if (data.prenume !== undefined) updateData.prenume = data.prenume || null;
    if (data.telefon !== undefined) updateData.telefon = data.telefon;
    if (data.telefonSecundar !== undefined) updateData.telefonSecundar = data.telefonSecundar || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.judet !== undefined) updateData.judet = data.judet || null;
    if (data.localitate !== undefined) updateData.localitate = data.localitate || null;
    if (data.adresa !== undefined) updateData.adresa = data.adresa || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sursa !== undefined) updateData.sursa = data.sursa;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.valoareEstimata !== undefined) updateData.valoareEstimata = parseDecimal(data.valoareEstimata);
    if (data.valoareFinala !== undefined) updateData.valoareFinala = parseDecimal(data.valoareFinala);
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.dataContact !== undefined) updateData.dataContact = parseDate(data.dataContact);
    if (data.dataUrmarire !== undefined) updateData.dataUrmarire = parseDate(data.dataUrmarire);
    if (data.agentId !== undefined) updateData.agentId = data.agentId || null;

    const [client] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    
    return client || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async getClientStats(agentId?: string): Promise<{ 
    total: number; 
    byStatus: Record<string, number>; 
    totalValue: number;
    wonValue: number;
    pipelineValue: number;
  }> {
    let query = db.select().from(clients);
    
    if (agentId) {
      query = query.where(eq(clients.agentId, agentId)) as any;
    }
    
    const allClients = await query;
    
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    let wonValue = 0;
    let pipelineValue = 0;
    
    for (const client of allClients) {
      byStatus[client.status] = (byStatus[client.status] || 0) + 1;
      
      if (client.status === "CASTIGAT" && client.valoareFinala) {
        wonValue += parseFloat(client.valoareFinala);
        totalValue += parseFloat(client.valoareFinala);
      } else if (client.valoareEstimata) {
        pipelineValue += parseFloat(client.valoareEstimata);
        totalValue += parseFloat(client.valoareEstimata);
      }
    }
    
    return {
      total: allClients.length,
      byStatus,
      totalValue,
      wonValue,
      pipelineValue
    };
  }

  async getActiveAgentsCount(): Promise<number> {
    const activeAgents = await db.select().from(users).where(
      and(
        eq(users.active, true),
        eq(users.role, "AGENT")
      )
    );
    return activeAgents.length;
  }

  async getAgents(): Promise<SafeUser[]> {
    const agents = await db.select().from(users).where(
      and(
        eq(users.active, true),
        or(
          eq(users.role, "AGENT"),
          eq(users.role, "ADMIN")
        )
      )
    );
    return agents.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
  }

  async getClientStatsWithPeriod(agentId?: string, startDate?: Date, endDate?: Date): Promise<{ 
    total: number; 
    byStatus: Record<string, number>; 
    totalValue: number;
    wonValue: number;
    pipelineValue: number;
  }> {
    const conditions = [];
    
    if (agentId) {
      conditions.push(eq(clients.agentId, agentId));
    }
    
    if (startDate) {
      conditions.push(gte(clients.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(clients.createdAt, endDate));
    }

    let query = db.select().from(clients);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const allClients = await query;
    
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    let wonValue = 0;
    let pipelineValue = 0;
    
    for (const client of allClients) {
      byStatus[client.status] = (byStatus[client.status] || 0) + 1;
      
      if (client.status === "CASTIGAT" && client.valoareFinala) {
        wonValue += parseFloat(client.valoareFinala);
        totalValue += parseFloat(client.valoareFinala);
      } else if (client.valoareEstimata) {
        pipelineValue += parseFloat(client.valoareEstimata);
        totalValue += parseFloat(client.valoareEstimata);
      }
    }
    
    return {
      total: allClients.length,
      byStatus,
      totalValue,
      wonValue,
      pipelineValue
    };
  }

  // ============ TARGET METHODS ============

  async getTarget(id: string): Promise<Target | undefined> {
    const [target] = await db.select().from(targets).where(eq(targets.id, id));
    return target || undefined;
  }

  async getAllTargets(filters?: { agentId?: string; luna?: number; an?: number }): Promise<Target[]> {
    const conditions = [];
    
    if (filters?.agentId) {
      conditions.push(eq(targets.agentId, filters.agentId));
    }
    
    if (filters?.luna) {
      conditions.push(eq(targets.luna, filters.luna));
    }
    
    if (filters?.an) {
      conditions.push(eq(targets.an, filters.an));
    }

    let query = db.select().from(targets);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(targets.an), desc(targets.luna));
  }

  async createTarget(data: CreateTarget): Promise<Target> {
    const [target] = await db.insert(targets).values({
      agentId: data.agentId,
      luna: data.luna,
      an: data.an,
      targetVanzari: data.targetVanzari,
      targetClienti: data.targetClienti || 0,
    }).returning();
    return target;
  }

  async updateTarget(id: string, data: UpdateTarget): Promise<Target | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.agentId !== undefined) updateData.agentId = data.agentId;
    if (data.luna !== undefined) updateData.luna = data.luna;
    if (data.an !== undefined) updateData.an = data.an;
    if (data.targetVanzari !== undefined) updateData.targetVanzari = data.targetVanzari;
    if (data.targetClienti !== undefined) updateData.targetClienti = data.targetClienti;

    const [target] = await db
      .update(targets)
      .set(updateData)
      .where(eq(targets.id, id))
      .returning();
    
    return target || undefined;
  }

  async deleteTarget(id: string): Promise<boolean> {
    const result = await db.delete(targets).where(eq(targets.id, id)).returning();
    return result.length > 0;
  }

  async getTargetProgress(agentId: string, luna: number, an: number): Promise<{ 
    target: Target | null; 
    realizedValue: number; 
    realizedClients: number;
  }> {
    const [target] = await db.select().from(targets).where(
      and(
        eq(targets.agentId, agentId),
        eq(targets.luna, luna),
        eq(targets.an, an)
      )
    );

    const startDate = new Date(an, luna - 1, 1);
    const endDate = new Date(an, luna, 0, 23, 59, 59);

    const wonClients = await db.select().from(clients).where(
      and(
        eq(clients.agentId, agentId),
        eq(clients.status, "CASTIGAT"),
        gte(clients.updatedAt, startDate),
        lte(clients.updatedAt, endDate)
      )
    );

    let realizedValue = 0;
    for (const client of wonClients) {
      if (client.valoareFinala) {
        realizedValue += parseFloat(client.valoareFinala);
      }
    }

    return {
      target: target || null,
      realizedValue,
      realizedClients: wonClients.length
    };
  }

  // ============ PARTNER METHODS ============

  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async getAllPartners(filters?: { tipPartener?: string; activ?: boolean; search?: string }): Promise<Partner[]> {
    const conditions = [];
    
    if (filters?.tipPartener) {
      conditions.push(eq(partners.tipPartener, filters.tipPartener as any));
    }
    
    if (filters?.activ !== undefined) {
      conditions.push(eq(partners.activ, filters.activ));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(partners.nume, searchTerm),
          ilike(partners.cui, searchTerm),
          ilike(partners.persoanaContact, searchTerm),
          ilike(partners.telefon, searchTerm)
        )
      );
    }

    let query = db.select().from(partners);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(partners.createdAt));
  }

  async createPartner(data: CreatePartner): Promise<Partner> {
    const [partner] = await db.insert(partners).values({
      nume: data.nume,
      tipPartener: data.tipPartener || "FURNIZOR",
      cui: data.cui || null,
      telefon: data.telefon || null,
      email: data.email || null,
      adresa: data.adresa || null,
      persoanaContact: data.persoanaContact || null,
      note: data.note || null,
      activ: data.activ !== undefined ? data.activ : true,
    }).returning();
    return partner;
  }

  async updatePartner(id: string, data: UpdatePartner): Promise<Partner | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.nume !== undefined) updateData.nume = data.nume;
    if (data.tipPartener !== undefined) updateData.tipPartener = data.tipPartener;
    if (data.cui !== undefined) updateData.cui = data.cui || null;
    if (data.telefon !== undefined) updateData.telefon = data.telefon || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.adresa !== undefined) updateData.adresa = data.adresa || null;
    if (data.persoanaContact !== undefined) updateData.persoanaContact = data.persoanaContact || null;
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.activ !== undefined) updateData.activ = data.activ;

    const [partner] = await db
      .update(partners)
      .set(updateData)
      .where(eq(partners.id, id))
      .returning();
    
    return partner || undefined;
  }

  async deletePartner(id: string): Promise<boolean> {
    const result = await db.delete(partners).where(eq(partners.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
