import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT", "SPECIAL"]);

export const clientSourceEnum = pgEnum("client_source", [
  "FACEBOOK",
  "GOOGLE",
  "RECLAME",
  "SITE",
  "RECOMANDARE",
  "TARG",
  "ALTELE"
]);

export const productCategoryEnum = pgEnum("product_category", [
  "GARD",
  "ACOPERIS",
  "RULOURI_EXTERIOARE",
  "FATADA",
  "SISTEM_PLUVIAL",
  "FERESTRE_MANSARDA",
  "SAGEAC",
  "ACCESORII",
  "ELEMENTE_SPECIALE",
  "STORE_EXTERIOARE",
  "JALUZELE_INTERIOARE",
  "ROLETE",
  "PLISEE",
  "VENTILATII"
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "NOU",
  "CONTACTAT",
  "INFORMATII",
  "OFERTAT",
  "FOLLOW_UP",
  "PROSPECT",
  "CUSTODIE",
  "VANDUT",
  "PIERDUT"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "CUSTODIE",
  "COMANDAT",
  "LISTAT",
  "IN_PRODUCTIE",
  "PRODUS",
  "LIVRAT"
]);

export const colorEnum = pgEnum("color_ral", [
  "RAL_9005",
  "RAL_7016",
  "RAL_7024",
  "RAL_8019",
  "RAL_8017",
  "RAL_3005",
  "RAL_8004",
  "RAL_9002",
  "RAL_6005",
  "RAL_6020",
  "RAL_3011",
  "RAL_7001",
  "RAL_1015"
]);

export const thicknessEnum = pgEnum("thickness", [
  "0.50",
  "0.60"
]);

export const finishEnum = pgEnum("finish_type", [
  "MAT",
  "LUCIOS",
  "BRILIANT",
  "MAT_DUO",
  "LUCIOS_DUO",
  "BRILIANT_DUO"
]);

export const brandEnum = pgEnum("brand", [
  "CARETTA",
  "BILKA",
  "WETTERBEST",
  "METALLIC_GROUP",
  "MX",
  "ZEBRA",
  "FAKRO",
  "VELUX",
  "NOVATIK",
  "METIGLA",
  "BUDMAT",
  "STUBAI",
  "TPS",
  "ROOF4YOU",
  "CUTATA"
]);

export const modelEnum = pgEnum("model", [
  "SIPCA_GARD",
  "TRAFORAT",
  "MX_15",
  "MX_25",
  "MX_60",
  "MC_75",
  "MC_105",
  "MX_15_DUO",
  "MX_25_DUO",
  "MX_60_DUO",
  "MC_75_DUO",
  "MC_105_DUO",
  "CLASIC",
  "CANTO",
  "NOBEL",
  "GLADIATOR",
  "IBERIC",
  "BALCANIC",
  "X121",
  "X140",
  "X174",
  "Y109",
  "Y118",
  "DAILY"
]);

export const commissionPercentEnum = pgEnum("commission_percent", [
  "1",
  "2",
  "3"
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
  
  // SECȚIUNEA 1: Informații de bază
  dataAdaugare: timestamp("data_adaugare").defaultNow(),
  sursa: clientSourceEnum("sursa").default("ALTELE"),
  nume: varchar("nume", { length: 100 }).notNull(),
  telefon: varchar("telefon", { length: 50 }).notNull(),
  email: varchar("email", { length: 120 }),
  localitate: varchar("localitate", { length: 100 }),
  judet: varchar("judet", { length: 100 }),
  
  // SECȚIUNEA 2: Informații partener
  isPartnerOrder: boolean("is_partner_order").default(false),
  partnerId: varchar("partner_id", { length: 36 }).references(() => partners.id),
  
  // SECȚIUNEA 3: Detalii produs
  categorieProdus: productCategoryEnum("categorie_produs").default("GARD"),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  suprafataMp: decimal("suprafata_mp", { precision: 10, scale: 2 }),
  culoare: varchar("culoare", { length: 100 }),
  grosime: varchar("grosime", { length: 20 }),
  finisaj: varchar("finisaj", { length: 50 }),
  mlRulouProd: decimal("ml_rulou_prod", { precision: 10, scale: 2 }),
  smartDripstop: boolean("smart_dripstop").default(false),
  
  // SECȚIUNEA 4: Ofertă și vânzare
  valoareOferta: decimal("valoare_oferta", { precision: 12, scale: 2 }),
  stadiuOferta: offerStatusEnum("stadiu_oferta").default("NOU"),
  dataOfertarii: timestamp("data_ofertarii"),
  stadiuComanda: orderStatusEnum("stadiu_comanda"),
  dataVanzarii: timestamp("data_vanzarii"),
  dataLivrarii: timestamp("data_livrarii"),
  procentComision: commissionPercentEnum("procent_comision"),
  comisionOferta: decimal("comision_oferta", { precision: 12, scale: 2 }),
  incasat: boolean("incasat").default(false),
  pretAchizitie: decimal("pret_achizitie", { precision: 12, scale: 2 }),
  
  // SECȚIUNEA 5: Fișiere (salvăm doar numele, fișierele vor fi în storage separat)
  ofertaFilename: varchar("oferta_filename", { length: 255 }),
  ofertaFilename2: varchar("oferta_filename_2", { length: 255 }),
  
  // SECȚIUNEA 6: Follow-up 1
  dataRevenire1: timestamp("data_revenire_1"),
  comentariuObservatii1: text("comentariu_observatii_1"),
  followUpEfectuat1: boolean("follow_up_efectuat_1").default(false),
  
  // Follow-up 2
  dataRevenire2: timestamp("data_revenire_2"),
  comentariuObservatii2: text("comentariu_observatii_2"),
  followUpEfectuat2: boolean("follow_up_efectuat_2").default(false),
  
  // Follow-up 3
  dataRevenire3: timestamp("data_revenire_3"),
  comentariuObservatii3: text("comentariu_observatii_3"),
  followUpEfectuat3: boolean("follow_up_efectuat_3").default(false),
  
  // SECȚIUNEA 7: Observații generale
  observatiiClient: text("observatii_client"),
  comentariiDupaContact: text("comentarii_dupa_contact"),
  contactat: boolean("contactat").default(false),
  
  // Relații
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
  // Secțiunea 1: Informații de bază
  dataAdaugare: z.string().optional(),
  sursa: z.enum(["FACEBOOK", "GOOGLE", "RECLAME", "SITE", "RECOMANDARE", "TARG", "ALTELE"]).default("ALTELE"),
  nume: z.string().min(1, "Numele este obligatoriu"),
  telefon: z.string().min(1, "Telefonul este obligatoriu"),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  localitate: z.string().optional(),
  judet: z.string().optional(),
  
  // Secțiunea 2: Informații partener
  isPartnerOrder: z.boolean().optional().default(false),
  partnerId: z.string().optional(),
  
  // Secțiunea 3: Detalii produs
  categorieProdus: z.enum(["GARD", "ACOPERIS", "RULOURI_EXTERIOARE", "FATADA", "SISTEM_PLUVIAL", "FERESTRE_MANSARDA", "SAGEAC", "ACCESORII", "ELEMENTE_SPECIALE", "STORE_EXTERIOARE", "JALUZELE_INTERIOARE", "ROLETE", "PLISEE", "VENTILATII"]).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  suprafataMp: z.string().optional(),
  culoare: z.string().optional(),
  grosime: z.string().optional(),
  finisaj: z.string().optional(),
  mlRulouProd: z.string().optional(),
  smartDripstop: z.boolean().optional().default(false),
  
  // Secțiunea 4: Ofertă și vânzare
  valoareOferta: z.string().optional(),
  stadiuOferta: z.enum(["NOUA", "TRIMISA", "IN_ASTEPTARE", "ACCEPTATA", "VANDUT", "REFUZAT", "ANULATA"]).optional(),
  dataOfertarii: z.string().optional(),
  stadiuComanda: z.enum(["CUSTODIE", "COMANDAT", "LISTAT", "IN_PRODUCTIE", "PRODUS", "LIVRAT"]).optional(),
  dataVanzarii: z.string().optional(),
  dataLivrarii: z.string().optional(),
  procentComision: z.enum(["1", "2", "3"]).optional(),
  comisionOferta: z.string().optional(),
  incasat: z.boolean().optional().default(false),
  pretAchizitie: z.string().optional(),
  
  // Secțiunea 5: Fișiere
  ofertaFilename: z.string().optional(),
  ofertaFilename2: z.string().optional(),
  
  // Secțiunea 6: Follow-up
  dataRevenire1: z.string().optional(),
  comentariuObservatii1: z.string().optional(),
  followUpEfectuat1: z.boolean().optional().default(false),
  dataRevenire2: z.string().optional(),
  comentariuObservatii2: z.string().optional(),
  followUpEfectuat2: z.boolean().optional().default(false),
  dataRevenire3: z.string().optional(),
  comentariuObservatii3: z.string().optional(),
  followUpEfectuat3: z.boolean().optional().default(false),
  
  // Secțiunea 7: Observații
  observatiiClient: z.string().optional(),
  comentariiDupaContact: z.string().optional(),
  contactat: z.boolean().optional().default(false),
  
  // Relații
  agentId: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientSource = "FACEBOOK" | "GOOGLE" | "RECLAME" | "SITE" | "RECOMANDARE" | "TARG" | "ALTELE";
export type ProductCategory = "GARD" | "ACOPERIS" | "RULOURI_EXTERIOARE" | "FATADA" | "SISTEM_PLUVIAL" | "FERESTRE_MANSARDA" | "SAGEAC" | "ACCESORII" | "ELEMENTE_SPECIALE" | "STORE_EXTERIOARE" | "JALUZELE_INTERIOARE" | "ROLETE" | "PLISEE";
export type OfferStatus = "NOUA" | "TRIMISA" | "IN_ASTEPTARE" | "ACCEPTATA" | "VANDUT" | "REFUZAT" | "ANULATA";
export type OrderStatus = "CUSTODIE" | "COMANDAT" | "LISTAT" | "IN_PRODUCTIE" | "PRODUS" | "LIVRAT";
export type ColorRAL = "RAL_9005" | "RAL_7016" | "RAL_7024" | "RAL_8019" | "RAL_8017" | "RAL_3005" | "RAL_8004" | "RAL_9002" | "RAL_6005" | "RAL_6020" | "RAL_3011" | "RAL_7001" | "RAL_1015";
export type Thickness = "0.50" | "0.60";
export type FinishType = "MAT" | "LUCIOS" | "BRILIANT" | "MAT_DUO" | "LUCIOS_DUO" | "BRILIANT_DUO";
export type Brand = "CARETTA" | "BILKA" | "WETTERBEST" | "METALLIC_GROUP" | "MX" | "ZEBRA" | "FAKRO" | "VELUX" | "NOVATIK" | "METIGLA" | "BUDMAT" | "STUBAI" | "TPS" | "ROOF4YOU" | "CUTATA";
export type Model = "SIPCA_GARD" | "TRAFORAT" | "MX_15" | "MX_25" | "MX_60" | "MC_75" | "MC_105" | "MX_15_DUO" | "MX_25_DUO" | "MX_60_DUO" | "MC_75_DUO" | "MC_105_DUO" | "CLASIC" | "CANTO" | "NOBEL" | "GLADIATOR" | "IBERIC" | "BALCANIC" | "X121" | "X140" | "X174" | "Y109" | "Y118" | "DAILY";
export type CommissionPercent = "1" | "2" | "3";

// ============ TARGETS (Target-uri) ============

export const targets = pgTable("targets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id).notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  targetVanzari: decimal("target_vanzari", { precision: 12, scale: 2 }).notNull(),
  targetClienti: integer("target_clienti").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createTargetSchema = z.object({
  agentId: z.string().min(1, "Agentul este obligatoriu"),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  targetVanzari: z.string().min(1, "Target-ul de vânzări este obligatoriu"),
  targetClienti: z.number().min(0).default(0),
});

export const updateTargetSchema = createTargetSchema.partial();

export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type CreateTarget = z.infer<typeof createTargetSchema>;
export type UpdateTarget = z.infer<typeof updateTargetSchema>;

// ============ PARTNERS (Parteneri) ============

export const partnerTypeEnum = pgEnum("partner_type", [
  "FURNIZOR",
  "SUBCONTRACTOR", 
  "COLABORATOR",
  "DISTRIBUITOR"
]);

export const partners = pgTable("partners", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nume: varchar("nume", { length: 150 }).notNull(),
  tipPartener: partnerTypeEnum("tip_partener").notNull().default("FURNIZOR"),
  cui: varchar("cui", { length: 20 }),
  telefon: varchar("telefon", { length: 20 }),
  email: varchar("email", { length: 120 }),
  adresa: text("adresa"),
  persoanaContact: varchar("persoana_contact", { length: 100 }),
  note: text("note"),
  activ: boolean("activ").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createPartnerSchema = z.object({
  nume: z.string().min(1, "Numele este obligatoriu"),
  tipPartener: z.enum(["FURNIZOR", "SUBCONTRACTOR", "COLABORATOR", "DISTRIBUITOR"]).default("FURNIZOR"),
  cui: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  adresa: z.string().optional(),
  persoanaContact: z.string().optional(),
  note: z.string().optional(),
  activ: z.boolean().default(true),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type CreatePartner = z.infer<typeof createPartnerSchema>;
export type UpdatePartner = z.infer<typeof updatePartnerSchema>;
export type PartnerType = "FURNIZOR" | "SUBCONTRACTOR" | "COLABORATOR" | "DISTRIBUITOR";

// ============ SEDII (Locații/Showroom-uri) ============

export const sedii = pgTable("sedii", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nume: varchar("nume", { length: 100 }).notNull(),
  adresa: varchar("adresa", { length: 200 }),
  oras: varchar("oras", { length: 50 }),
  judet: varchar("judet", { length: 50 }),
  telefon: varchar("telefon", { length: 50 }),
  email: varchar("email", { length: 120 }),
  activ: boolean("activ").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSediuSchema = createInsertSchema(sedii).omit({
  id: true,
  createdAt: true,
});

export const createSediuSchema = z.object({
  nume: z.string().min(1, "Numele este obligatoriu"),
  adresa: z.string().optional(),
  oras: z.string().optional(),
  judet: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  activ: z.boolean().default(true),
});

export const updateSediuSchema = createSediuSchema.partial();

export type Sediu = typeof sedii.$inferSelect;
export type InsertSediu = z.infer<typeof insertSediuSchema>;
export type CreateSediu = z.infer<typeof createSediuSchema>;
export type UpdateSediu = z.infer<typeof updateSediuSchema>;

// ============ EXPENSE CATEGORIES (Categorii cheltuieli - ierarhic) ============

export const categoryLevelEnum = pgEnum("category_level", ["main", "sub", "detail"]);

export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: varchar("parent_id", { length: 36 }),
  level: categoryLevelEnum("level").notNull(),
  active: boolean("active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Numele este obligatoriu"),
  parentId: z.string().optional().nullable(),
  level: z.enum(["main", "sub", "detail"]),
  active: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type CreateExpenseCategory = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategory = z.infer<typeof updateExpenseCategorySchema>;
export type CategoryLevel = "main" | "sub" | "detail";

// ============ CHELTUIELI AGENT ============

export const cheltuieliAgent = pgTable("cheltuieli_agent", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),
  
  categoryId: varchar("category_id", { length: 36 }).references(() => expenseCategories.id),
  subcategoryId: varchar("subcategory_id", { length: 36 }).references(() => expenseCategories.id),
  detailCategoryId: varchar("detail_category_id", { length: 36 }).references(() => expenseCategories.id),
  
  suma: decimal("suma", { precision: 12, scale: 2 }).notNull(),
  descriere: text("descriere"),
  dataCheltuiala: timestamp("data_cheltuiala").notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  
  judet: varchar("judet", { length: 100 }),
  sediuId: varchar("sediu_id", { length: 36 }).references(() => sedii.id),
  firma: varchar("firma", { length: 100 }),
  autoNr: varchar("auto_nr", { length: 50 }),
  
  facturaFilename: varchar("factura_filename", { length: 255 }),
  documentUrl: varchar("document_url", { length: 500 }),
  
  tipCheltuiala: varchar("tip_cheltuiala", { length: 50 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCheltuialaAgentSchema = createInsertSchema(cheltuieliAgent).omit({
  id: true,
  createdAt: true,
});

export const createCheltuialaAgentSchema = z.object({
  agentId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Categoria este obligatorie"),
  subcategoryId: z.string().min(1, "Subcategoria este obligatorie"),
  detailCategoryId: z.string().optional().nullable(),
  suma: z.string().min(1, "Suma este obligatorie"),
  descriere: z.string().optional(),
  dataCheltuiala: z.string().min(1, "Data este obligatorie"),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  judet: z.string().optional(),
  sediuId: z.string().optional().nullable(),
  firma: z.string().min(1, "Firma este obligatorie"),
  autoNr: z.string().optional(),
  facturaFilename: z.string().optional(),
  documentUrl: z.string().optional(),
  tipCheltuiala: z.string().optional(),
});

export const updateCheltuialaAgentSchema = createCheltuialaAgentSchema.partial();

export type CheltuialaAgent = typeof cheltuieliAgent.$inferSelect;
export type InsertCheltuialaAgent = z.infer<typeof insertCheltuialaAgentSchema>;
export type CreateCheltuialaAgent = z.infer<typeof createCheltuialaAgentSchema>;
export type UpdateCheltuialaAgent = z.infer<typeof updateCheltuialaAgentSchema>;

// ============ CHELTUIELI SEDIU ============

export const cheltuieliSediu = pgTable("cheltuieli_sediu", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  sediuId: varchar("sediu_id", { length: 36 }).references(() => sedii.id).notNull(),
  
  categoryId: varchar("category_id", { length: 36 }).references(() => expenseCategories.id),
  subcategoryId: varchar("subcategory_id", { length: 36 }).references(() => expenseCategories.id),
  detailCategoryId: varchar("detail_category_id", { length: 36 }).references(() => expenseCategories.id),
  
  suma: decimal("suma", { precision: 12, scale: 2 }).notNull(),
  descriere: text("descriere"),
  dataCheltuiala: timestamp("data_cheltuiala").notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  
  firma: varchar("firma", { length: 100 }),
  
  facturaFilename: varchar("factura_filename", { length: 255 }),
  documentUrl: varchar("document_url", { length: 500 }),
  
  tipCheltuiala: varchar("tip_cheltuiala", { length: 50 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCheltuialaSediuSchema = createInsertSchema(cheltuieliSediu).omit({
  id: true,
  createdAt: true,
});

export const createCheltuialaSediuSchema = z.object({
  sediuId: z.string().min(1, "Sediul este obligatoriu"),
  categoryId: z.string().min(1, "Categoria este obligatorie"),
  subcategoryId: z.string().min(1, "Subcategoria este obligatorie"),
  detailCategoryId: z.string().optional().nullable(),
  suma: z.string().min(1, "Suma este obligatorie"),
  descriere: z.string().optional(),
  dataCheltuiala: z.string().min(1, "Data este obligatorie"),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  firma: z.string().min(1, "Firma este obligatorie"),
  facturaFilename: z.string().optional(),
  tipCheltuiala: z.string().optional(),
});

export const updateCheltuialaSediuSchema = createCheltuialaSediuSchema.partial();

export type CheltuialaSediu = typeof cheltuieliSediu.$inferSelect;
export type InsertCheltuialaSediu = z.infer<typeof insertCheltuialaSediuSchema>;
export type CreateCheltuialaSediu = z.infer<typeof createCheltuialaSediuSchema>;
export type UpdateCheltuialaSediu = z.infer<typeof updateCheltuialaSediuSchema>;

// ============ AGENT MANUAL ACQUISITIONS (Achiziții manuale pe lună) ============

export const agentManualAchizitii = pgTable("agent_manual_achizitii", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id).notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  
  achizitieGard: decimal("achizitie_gard", { precision: 12, scale: 2 }).default("0"),
  achizitieAcoperis: decimal("achizitie_acoperis", { precision: 12, scale: 2 }).default("0"),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentManualAchizitiiSchema = createInsertSchema(agentManualAchizitii).omit({
  id: true,
  updatedAt: true,
});

export type AgentManualAchizitii = typeof agentManualAchizitii.$inferSelect;
export type InsertAgentManualAchizitii = z.infer<typeof insertAgentManualAchizitiiSchema>;

// ============ AGENT SALES PROFITABILITY ============

export const agentSalesProfitability = pgTable("agent_sales_profitability", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id).notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  
  venitGard: decimal("venit_gard", { precision: 12, scale: 2 }).default("0"),
  achizitieGard: decimal("achizitie_gard", { precision: 12, scale: 2 }).default("0"),
  adaosGard: decimal("adaos_gard", { precision: 12, scale: 2 }).default("0"),
  comisionGard: decimal("comision_gard", { precision: 12, scale: 2 }).default("0"),
  
  venitAcoperis: decimal("venit_acoperis", { precision: 12, scale: 2 }).default("0"),
  achizitieAcoperis: decimal("achizitie_acoperis", { precision: 12, scale: 2 }).default("0"),
  adaosAcoperis: decimal("adaos_acoperis", { precision: 12, scale: 2 }).default("0"),
  comisionAcoperis: decimal("comision_acoperis", { precision: 12, scale: 2 }).default("0"),
  
  nrVanzariGard: integer("nr_vanzari_gard").default(0),
  nrVanzariAcoperis: integer("nr_vanzari_acoperis").default(0),
  
  venitTvaTotal: decimal("venit_tva_total", { precision: 12, scale: 2 }).default("0"),
  comisionPercentMediu: decimal("comision_percent_mediu", { precision: 5, scale: 2 }).default("0"),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgentSalesProfitability = typeof agentSalesProfitability.$inferSelect;

// ============ AGENT FIXED COSTS (Cheltuieli fixe lunare pentru agenți) ============

export const agentFixedCosts = pgTable("agent_fixed_costs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id).notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  
  salariu: decimal("salariu", { precision: 12, scale: 2 }).default("0"),
  amortizareAuto: decimal("amortizare_auto", { precision: 12, scale: 2 }).default("0"),
  combustibil: decimal("combustibil", { precision: 12, scale: 2 }).default("0"),
  revizii: decimal("revizii", { precision: 12, scale: 2 }).default("0"),
  alteCheltuieliAuto: decimal("alte_cheltuieli_auto", { precision: 12, scale: 2 }).default("0"),
  abonamente: decimal("abonamente", { precision: 12, scale: 2 }).default("0"),
  diurne: decimal("diurne", { precision: 12, scale: 2 }).default("0"),
  alteCheltuieli: decimal("alte_cheltuieli", { precision: 12, scale: 2 }).default("0"),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentFixedCostsSchema = createInsertSchema(agentFixedCosts).omit({
  id: true,
  updatedAt: true,
});

export type AgentFixedCosts = typeof agentFixedCosts.$inferSelect;
export type InsertAgentFixedCosts = z.infer<typeof insertAgentFixedCostsSchema>;
