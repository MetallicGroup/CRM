import { 
  users, 
  clients,
  type User, 
  type InsertUser, 
  type SafeUser, 
  type CreateUser, 
  type UpdateUser,
  type Client,
  type CreateClient,
  type UpdateClient 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
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
  getClientStats(agentId?: string): Promise<{ total: number; byStatus: Record<string, number> }>;
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
      valoareEstimata: data.valoareEstimata || null,
      valoareFinala: data.valoareFinala || null,
      note: data.note || null,
      dataContact: data.dataContact ? new Date(data.dataContact) : null,
      dataUrmarire: data.dataUrmarire ? new Date(data.dataUrmarire) : null,
      agentId: data.agentId || null,
    };

    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, data: UpdateClient): Promise<Client | undefined> {
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
    if (data.valoareEstimata !== undefined) updateData.valoareEstimata = data.valoareEstimata || null;
    if (data.valoareFinala !== undefined) updateData.valoareFinala = data.valoareFinala || null;
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.dataContact !== undefined) updateData.dataContact = data.dataContact ? new Date(data.dataContact) : null;
    if (data.dataUrmarire !== undefined) updateData.dataUrmarire = data.dataUrmarire ? new Date(data.dataUrmarire) : null;
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

  async getClientStats(agentId?: string): Promise<{ total: number; byStatus: Record<string, number> }> {
    let query = db.select().from(clients);
    
    if (agentId) {
      query = query.where(eq(clients.agentId, agentId)) as any;
    }
    
    const allClients = await query;
    
    const byStatus: Record<string, number> = {};
    for (const client of allClients) {
      byStatus[client.status] = (byStatus[client.status] || 0) + 1;
    }
    
    return {
      total: allClients.length,
      byStatus
    };
  }
}

export const storage = new DatabaseStorage();
