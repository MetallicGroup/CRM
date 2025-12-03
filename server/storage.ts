import { users, type User, type InsertUser, type SafeUser, type CreateUser, type UpdateUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: CreateUser): Promise<SafeUser>;
  updateUser(id: string, userData: UpdateUser): Promise<SafeUser | undefined>;
  getAllUsers(): Promise<SafeUser[]>;
  validatePassword(email: string, password: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;
  updateLastActivity(id: string): Promise<void>;
  changePassword(id: string, newPassword: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
