import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT", "SPECIAL"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 120 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  role: userRoleEnum("role").notNull().default("AGENT"),
  specialKey: varchar("special_key", { length: 50 }),
  active: boolean("active").notNull().default(true),
  sediuId: varchar("sediu_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
  lastActivity: timestamp("last_activity"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  lastActivity: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email invalid"),
  password: z.string().min(1, "Parola este obligatorie"),
});

export const createUserSchema = z.object({
  email: z.string().email("Email invalid"),
  password: z.string().min(6, "Parola trebuie să aibă minim 6 caractere"),
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  role: z.enum(["ADMIN", "AGENT", "SPECIAL"]).default("AGENT"),
  specialKey: z.string().optional(),
  sediuId: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Email invalid").optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "AGENT", "SPECIAL"]).optional(),
  specialKey: z.string().optional().nullable(),
  active: z.boolean().optional(),
  sediuId: z.string().optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = "ADMIN" | "AGENT" | "SPECIAL";
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type SafeUser = Omit<User, "passwordHash">;
