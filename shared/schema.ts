import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT", "SPECIAL"]);

export const clientStatusEnum = pgEnum("client_status", [
  "NOU",
  "CONTACTAT",
  "OFERTA_TRIMISA",
  "NEGOCIERE",
  "CASTIGAT",
  "PIERDUT",
  "ANULAT"
]);

export const clientSourceEnum = pgEnum("client_source", [
  "TELEFON",
  "EMAIL",
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE_ADS",
  "RECOMANDARE",
  "SHOWROOM",
  "ALTELE"
]);

export const productCategoryEnum = pgEnum("product_category", [
  "GARD",
  "ACOPERIS",
  "AMBELE"
]);

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

// ============ CLIENTS ============

export const clients = pgTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact info
  nume: varchar("nume", { length: 100 }).notNull(),
  prenume: varchar("prenume", { length: 100 }),
  telefon: varchar("telefon", { length: 20 }).notNull(),
  telefonSecundar: varchar("telefon_secundar", { length: 20 }),
  email: varchar("email", { length: 120 }),
  
  // Location
  judet: varchar("judet", { length: 50 }),
  localitate: varchar("localitate", { length: 100 }),
  adresa: text("adresa"),
  
  // Business info
  status: clientStatusEnum("status").notNull().default("NOU"),
  sursa: clientSourceEnum("sursa").notNull().default("TELEFON"),
  categorie: productCategoryEnum("categorie").notNull().default("GARD"),
  
  // Financial
  valoareEstimata: decimal("valoare_estimata", { precision: 12, scale: 2 }),
  valoareFinala: decimal("valoare_finala", { precision: 12, scale: 2 }),
  
  // Notes and dates
  note: text("note"),
  dataContact: timestamp("data_contact"),
  dataUrmarire: timestamp("data_urmarire"),
  
  // Relationships
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createClientSchema = z.object({
  nume: z.string().min(1, "Numele este obligatoriu"),
  prenume: z.string().optional(),
  telefon: z.string().min(1, "Telefonul este obligatoriu"),
  telefonSecundar: z.string().optional(),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  judet: z.string().optional(),
  localitate: z.string().optional(),
  adresa: z.string().optional(),
  status: z.enum(["NOU", "CONTACTAT", "OFERTA_TRIMISA", "NEGOCIERE", "CASTIGAT", "PIERDUT", "ANULAT"]).default("NOU"),
  sursa: z.enum(["TELEFON", "EMAIL", "WEBSITE", "FACEBOOK", "INSTAGRAM", "GOOGLE_ADS", "RECOMANDARE", "SHOWROOM", "ALTELE"]).default("TELEFON"),
  categorie: z.enum(["GARD", "ACOPERIS", "AMBELE"]).default("GARD"),
  valoareEstimata: z.string().optional(),
  valoareFinala: z.string().optional(),
  note: z.string().optional(),
  dataContact: z.string().optional(),
  dataUrmarire: z.string().optional(),
  agentId: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientStatus = "NOU" | "CONTACTAT" | "OFERTA_TRIMISA" | "NEGOCIERE" | "CASTIGAT" | "PIERDUT" | "ANULAT";
export type ClientSource = "TELEFON" | "EMAIL" | "WEBSITE" | "FACEBOOK" | "INSTAGRAM" | "GOOGLE_ADS" | "RECOMANDARE" | "SHOWROOM" | "ALTELE";
export type ProductCategory = "GARD" | "ACOPERIS" | "AMBELE";
