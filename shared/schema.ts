import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum, integer, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT", "SPECIAL"]);

export const clientSourceEnum = pgEnum("client_source", [
  "FACEBOOK",
  "GOOGLE",
  "RECLAME",
  "RECLAME_CAMPANII",
  "SITE",
  "RECOMANDARE",
  "TARG",
  "OLX",
  "CEL_RO",
  "OKAZII",
  "PUBLI24",
  "TELEFON",
  "MONTATORI_COLABORATORI",
  "MONTATORI",
  "BIROU",
  "BIROU_SHOWROOM",
  "COMPLETARE_CLIENT_VECHI",
  "COMPLETARE",
  "TIKTOK",
  "PARTENERI",
  "FURNIZORI",
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
  "VENTILATII",
  "SCARI_ACCES",
  "ACCESORII_FERESTRE",
  "SCULE"
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "NOUA",
  "TRIMISA",
  "IN_ASTEPTARE",
  "ACCEPTATA",
  "VANDUT",
  "REFUZAT",
  "ANULATA",
  "INFORMATII",
  "CONTACTAT",
  "NECONTACTAT",
  // Stadiu special, folosit doar de anumiți agenți (ex: Razvan / Alexandru)
  "RAZVAN",
]);

export const employeeTypeEnum = pgEnum("employee_type", ["AGENT", "PRODUCTIE", "INDIRECT"]);

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
  "RAL_1015",
  "RAL_5010"
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

export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// ============ CRM CHAT (mesaje între utilizatori) ============

export const crmMessages = pgTable("crm_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id", { length: 36 }).references(() => users.id).notNull(),
  recipientId: varchar("recipient_id", { length: 36 }).references(() => users.id).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCrmMessageSchema = createInsertSchema(crmMessages).omit({
  id: true,
  createdAt: true,
});

export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = z.infer<typeof insertCrmMessageSchema>;

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
  numCriteriu: integer("num_criteriu"),

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
  stadiuOferta: offerStatusEnum("stadiu_oferta").default("NOUA"),
  dataOfertarii: timestamp("data_ofertarii"),
  avans: boolean("avans").default(false),
  avansSuma: decimal("avans_suma", { precision: 12, scale: 2 }),
  avansIncasat: boolean("avans_incasat").default(false),
  stadiuComanda: orderStatusEnum("stadiu_comanda"),
  dataVanzarii: timestamp("data_vanzarii"),
  dataLivrarii: timestamp("data_livrarii"),
  procentComision: varchar("procent_comision", { length: 100 }),
  comisionOferta: decimal("comision_oferta", { precision: 12, scale: 2 }),
  incasat: boolean("incasat").default(false),
  pretAchizitie: decimal("pret_achizitie", { precision: 12, scale: 2 }),
  achizitiePartener: decimal("achizitie_partener", { precision: 12, scale: 2 }),

  // SECȚIUNEA 5: Fișiere (salvăm doar numele, fișierele vor fi în storage separat)
  ofertaFilename: varchar("oferta_filename", { length: 255 }),
  ofertaFilename2: varchar("oferta_filename_2", { length: 255 }),
  ofertaFilename3: varchar("oferta_filename_3", { length: 255 }),

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
  underObservation: boolean("under_observation").default(false), // Pentru pagina "Urmăriri clienți"
  urgenta: boolean("urgenta").default(false),
  prioritate: varchar("prioritate", { length: 20 }), // URGENT | CALDUT | RECE – bulina: roșu, galben, albastru deschis

  // Relații
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),

  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Tracking apeluri telefonice (click pe număr)
  lastCallAt: timestamp("last_call_at"),
  lastCallById: varchar("last_call_by_id", { length: 36 }),
  callCount: integer("call_count").notNull().default(0),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createClientSchema = z.object({
  // Secțiunea 1: Informații de bază
  dataAdaugare: z.string().optional(),
  sursa: z.enum([
    "FACEBOOK",
    "GOOGLE",
    "RECLAME",
    "RECLAME_CAMPANII",
    "SITE",
    "RECOMANDARE",
    "TARG",
    "OLX",
    "CEL_RO",
    "OKAZII",
    "PUBLI24",
    "TELEFON",
    "MONTATORI_COLABORATORI",
    "MONTATORI",
    "BIROU",
    "BIROU_SHOWROOM",
    "COMPLETARE_CLIENT_VECHI",
    "COMPLETARE",
    "TIKTOK",
    "PARTENERI",
    "FURNIZORI",
    "ALTELE"
  ]).default("ALTELE"),
  nume: z.string().min(1, "Numele este obligatoriu"),
  telefon: z.string().min(1, "Telefonul este obligatoriu"),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  localitate: z.string().optional(),
  judet: z.string().optional(),
  numCriteriu: z.number().optional(),

  // Secțiunea 2: Informații partener
  isPartnerOrder: z.boolean().optional().default(false),
  partnerId: z.string().optional(),

  // Secțiunea 3: Detalii produs
  categorieProdus: z.enum([
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
    "VENTILATII",
    "SCARI_ACCES",
    "ACCESORII_FERESTRE",
    "SCULE"
  ]).optional(),
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
  stadiuOferta: z
    .enum([
      "NOUA",
      "TRIMISA",
      "IN_ASTEPTARE",
      "ACCEPTATA",
      "VANDUT",
      "REFUZAT",
      "ANULATA",
      "INFORMATII",
      "CONTACTAT",
      "NECONTACTAT",
      "RAZVAN",
    ])
    .optional(),
  dataOfertarii: z.string().optional(),
  avans: z.boolean().optional().default(false),
  avansSuma: z.string().optional(),
  avansIncasat: z.boolean().optional().default(false),
  stadiuComanda: z.enum(["CUSTODIE", "COMANDAT", "LISTAT", "IN_PRODUCTIE", "PRODUS", "LIVRAT"]).nullable().optional(),
  dataVanzarii: z.string().optional(),
  dataLivrarii: z.string().optional(),
  procentComision: z.string().optional(),
  comisionOferta: z.string().optional(),
  incasat: z.boolean().optional().default(false),
  pretAchizitie: z.string().nullable().optional(),
  achizitiePartener: z.string().nullable().optional(),

  // Secțiunea 5: Fișiere
  ofertaFilename: z.string().nullable().optional(),
  ofertaFilename2: z.string().nullable().optional(),
  ofertaFilename3: z.string().nullable().optional(),

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
  underObservation: z.boolean().optional().default(false),
  urgenta: z.boolean().optional().default(false),
  prioritate: z.enum(["URGENT", "CALDUT", "RECE"]).optional().nullable(),

  // Relații
  agentId: z.string().optional(),
  // Tracking apeluri
  lastCallAt: z.string().optional(),
  lastCallById: z.string().optional(),
  callCount: z.number().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientSource =
  | "FACEBOOK"
  | "GOOGLE"
  | "RECLAME"
  | "RECLAME_CAMPANII"
  | "SITE"
  | "RECOMANDARE"
  | "TARG"
  | "OLX"
  | "CEL_RO"
  | "OKAZII"
  | "PUBLI24"
  | "TELEFON"
  | "MONTATORI_COLABORATORI"
  | "MONTATORI"
  | "BIROU"
  | "BIROU_SHOWROOM"
  | "COMPLETARE_CLIENT_VECHI"
  | "COMPLETARE"
  | "TIKTOK"
  | "PARTENERI"
  | "ALTELE";
export type ProductCategory =
  | "GARD"
  | "ACOPERIS"
  | "RULOURI_EXTERIOARE"
  | "FATADA"
  | "SISTEM_PLUVIAL"
  | "FERESTRE_MANSARDA"
  | "SAGEAC"
  | "ACCESORII"
  | "ELEMENTE_SPECIALE"
  | "STORE_EXTERIOARE"
  | "JALUZELE_INTERIOARE"
  | "ROLETE"
  | "PLISEE"
  | "VENTILATII"
  | "SCARI_ACCES"
  | "ACCESORII_FERESTRE"
  | "SCULE";
export type OfferStatus =
  | "NOUA"
  | "TRIMISA"
  | "IN_ASTEPTARE"
  | "ACCEPTATA"
  | "VANDUT"
  | "REFUZAT"
  | "ANULATA"
  | "INFORMATII"
  | "CONTACTAT"
  | "NECONTACTAT";
export type OrderStatus = "CUSTODIE" | "COMANDAT" | "LISTAT" | "IN_PRODUCTIE" | "PRODUS" | "LIVRAT";
export type ColorRAL = "RAL_9005" | "RAL_7016" | "RAL_7024" | "RAL_8019" | "RAL_8017" | "RAL_3005" | "RAL_8004" | "RAL_9002" | "RAL_6005" | "RAL_6020" | "RAL_3011" | "RAL_7001" | "RAL_1015" | "RAL_5010";
export type Thickness = "0.50" | "0.60";
export type FinishType = "MAT" | "LUCIOS" | "BRILIANT" | "MAT_DUO" | "LUCIOS_DUO" | "BRILIANT_DUO";
export type Brand = "CARETTA" | "BILKA" | "WETTERBEST" | "METALLIC_GROUP" | "MX" | "ZEBRA" | "FAKRO" | "VELUX" | "NOVATIK" | "METIGLA" | "BUDMAT" | "STUBAI" | "TPS" | "ROOF4YOU" | "CUTATA";
export type Model = "SIPCA_GARD" | "TRAFORAT" | "MX_15" | "MX_25" | "MX_60" | "MC_75" | "MC_105" | "MX_15_DUO" | "MX_25_DUO" | "MX_60_DUO" | "MC_75_DUO" | "MC_105_DUO" | "CLASIC" | "CANTO" | "NOBEL" | "GLADIATOR" | "IBERIC" | "BALCANIC" | "X121" | "X140" | "X174" | "Y109" | "Y118" | "DAILY";
export type CommissionPercent = "1" | "2" | "3";

// ============ TARGETS (Target-uri) ============

export const targetCategoriaEnum = pgEnum("target_categoria", ["AGENTI", "COMISIONARI", "PARTENERI", "DIRECTOR"]);

export const targets = pgTable("targets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  categoria: targetCategoriaEnum("categoria").notNull().default("AGENTI"),
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  targetVanzari: decimal("target_vanzari", { precision: 12, scale: 2 }).notNull(),
  targetClienti: integer("target_clienti").notNull().default(0),
  targetOferteTransmise: integer("target_oferte_transmise").notNull().default(0),
  targetFollowUp: integer("target_follow_up").notNull().default(0),
  targetConversie: decimal("target_conversie", { precision: 8, scale: 2 }),
  targetClientiNoi: integer("target_clienti_noi").notNull().default(0),
  targetColaboratoriNoi: integer("target_colaboratori_noi").notNull().default(0),
  targetPartenerActiv: integer("target_partener_activ").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createTargetSchema = z.object({
  categoria: z.enum(["AGENTI", "COMISIONARI", "PARTENERI", "DIRECTOR"]).default("AGENTI"),
  agentId: z.string().optional().nullable(),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  targetVanzari: z.string().min(1, "Target-ul în RON este obligatoriu"),
  targetClienti: z.number().min(0).default(0),
  targetOferteTransmise: z.number().min(0).default(0),
  targetFollowUp: z.number().min(0).default(0),
  targetConversie: z.string().optional().nullable(),
  targetClientiNoi: z.number().min(0).default(0),
  targetColaboratoriNoi: z.number().min(0).default(0),
  targetPartenerActiv: z.number().min(0).default(0),
});

export const updateTargetSchema = createTargetSchema.partial();

export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type CreateTarget = z.infer<typeof createTargetSchema>;
export type UpdateTarget = z.infer<typeof updateTargetSchema>;

// ============ TASKS / PROIECTE (Task-uri) ============

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  numeProiect: varchar("nume_proiect", { length: 255 }).notNull(),
  dataLimita: timestamp("data_limita", { withTimezone: true }),
  createdById: varchar("created_by_id", { length: 36 }).references(() => users.id).notNull(),
  assignedAgentId: varchar("assigned_agent_id", { length: 36 }).references(() => users.id),
  observatii: text("observatii"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createTaskSchema = z.object({
  numeProiect: z.string().min(1, "Numele proiectului este obligatoriu"),
  dataLimita: z.string().optional().nullable(),
  createdById: z.string().min(1, "Creatorul este obligatoriu"),
  assignedAgentId: z.string().optional().nullable(),
  observatii: z.string().optional().nullable(),
  completed: z.boolean().optional().default(false),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  createdById: z.string().optional(),
  completed: z.boolean().optional(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// ============ DOCUMENTAȚIE (categorii: Furnizori, Parteneri, Metallic Group, Fișă tehnică) ============

export const documenteCategorieEnum = pgEnum("documente_categorie", [
  "FURNIZORI",
  "PARTENERI",
  "METALLIC_GROUP",
  "FISA_TEHNICA",
]);

export const documente = pgTable("documente", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  categorie: documenteCategorieEnum("categorie").notNull(),
  nume: varchar("nume", { length: 255 }).notNull(),
  objectPath: varchar("object_path", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  uploadedById: varchar("uploaded_by_id", { length: 36 }).references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documente).omit({
  id: true,
  uploadedAt: true,
});

export const createDocumentSchema = z.object({
  categorie: z.enum(["FURNIZORI", "PARTENERI", "METALLIC_GROUP", "FISA_TEHNICA"]),
  nume: z.string().min(1, "Numele documentului este obligatoriu"),
  objectPath: z.string().min(1),
  fileName: z.string().optional(),
  uploadedById: z.string().optional(),
});

export type Document = typeof documente.$inferSelect;
export type CreateDocument = z.infer<typeof createDocumentSchema>;

// ============ PARTNERS (Parteneri) ============

export const partnerTypeEnum = pgEnum("partner_type", [
  // valori vechi (păstrate pentru compatibilitate cu datele existente)
  "FURNIZOR",
  "SUBCONTRACTOR",
  "COLABORATOR",
  "DISTRIBUITOR",
  // valori noi folosite în UI
  "COLABORATORI_PF",
  "PARTENER_COMISIONAR",
]);

export const partnerStatusPerformantaEnum = pgEnum("partner_status_performanta", ["PERFORMANT", "MEDIU", "OCAZIONAL"]);
export const partnerCalificareEnum = pgEnum("partner_calificare", ["INTERESAT", "NU"]);
export const partnerClasificareEnum = pgEnum("partner_clasificare", ["ATELIER", "FIRMA_MICA", "NECLAR"]);
export const partnerStatusContactEnum = pgEnum("partner_status_contact", [
  "CONTACTAT", "INTERESAT", "DISCUTII_DIRECTOR", "PARTENER_ACTIV", "PARTENER_RECURRENT", "REFUZAT"
]);

export const partners = pgTable("partners", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nume: varchar("nume", { length: 150 }).notNull(),
  tipPartener: partnerTypeEnum("tip_partener").notNull().default("DISTRIBUITOR"),
  cui: varchar("cui", { length: 20 }),
  telefon: varchar("telefon", { length: 20 }),
  email: varchar("email", { length: 120 }),
  adresa: text("adresa"),
  judet: varchar("judet", { length: 80 }),
  persoanaContact: varchar("persoana_contact", { length: 100 }),
  note: text("note"),
  platitorTva: boolean("platitor_tva").notNull().default(false),
  file1: varchar("file1", { length: 255 }),
  file2: varchar("file2", { length: 255 }),
  activ: boolean("activ").notNull().default(true),
  statusPerformanta: partnerStatusPerformantaEnum("status_performanta"),
  calificare: partnerCalificareEnum("calificare"),
  clasificare: partnerClasificareEnum("clasificare"),
  statusContact: partnerStatusContactEnum("status_contact"),
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
  tipPartener: z.enum(["DISTRIBUITOR", "COLABORATORI_PF", "PARTENER_COMISIONAR"]).default("DISTRIBUITOR"),
  cui: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().email("Email invalid").optional().or(z.literal("")),
  adresa: z.string().optional(),
  judet: z.string().optional(),
  persoanaContact: z.string().optional(),
  note: z.string().optional(),
  platitorTva: z.boolean().optional().default(false),
  statusPerformanta: z.enum(["PERFORMANT", "MEDIU", "OCAZIONAL"]).optional().nullable(),
  calificare: z.enum(["INTERESAT", "NU"]).optional().nullable(),
  clasificare: z.enum(["ATELIER", "FIRMA_MICA", "NECLAR"]).optional().nullable(),
  statusContact: z.enum(["CONTACTAT", "INTERESAT", "DISCUTII_DIRECTOR", "PARTENER_ACTIV", "PARTENER_RECURRENT", "REFUZAT"]).optional().nullable(),
  file1: z.string().optional(),
  file2: z.string().optional(),
  activ: z.boolean().default(true),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type CreatePartner = z.infer<typeof createPartnerSchema>;
export type UpdatePartner = z.infer<typeof updatePartnerSchema>;
export type PartnerType = "DISTRIBUITOR" | "COLABORATORI_PF" | "PARTENER_COMISIONAR";

// ============ ACTIVITY LOG (Jurnal activitate agenți) ============

export const activityTypeEnum = pgEnum("activity_type", [
  "LEAD_AUTO",          // lead intrat automat (ex: Facebook)
  "LEAD_MANUAL",        // lead adăugat manual de agent
  "STATUS_CHANGE",      // schimbare stadiu ofertă
  "PHONE_CLICK",        // click pe număr de telefon
  "FOLLOWUP_CLICK",     // bifare follow-up efectuat
  "OFFER_FILE_CHANGE",  // încărcare / înlocuire / ștergere fișier ofertă
]);

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id).notNull(),
  type: activityTypeEnum("type").notNull(),
  // detalii suplimentare (ex: de la ce status la ce status, ce follow-up, sursă, etc.)
  meta: json("meta").$type<Record<string, unknown> | null>().default(null),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type ActivityType = "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK" | "OFFER_FILE_CHANGE";
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

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
  subcategoryId: z.string().optional().nullable(), // opțional pentru categorii fără subcategorii (ex. Cheltuiala Vara, Cheltuiala Iarna)
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
  documentUrl: z.string().optional(),
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

// ============ SALARII ANGAJATI NEPRODUCTIVI (Producție și HQ/Indirect) ============

export const salariiNeproductivi = pgTable("salarii_neproductivi", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  numeAngajat: varchar("nume_angajat", { length: 200 }).notNull(),
  tipAngajat: varchar("tip_angajat", { length: 50 }).notNull(), // PRODUCTIE sau INDIRECT
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),

  salariuBrut: decimal("salariu_brut", { precision: 12, scale: 2 }).default("0"),
  salariuNet: decimal("salariu_net", { precision: 12, scale: 2 }).default("0"),
  bonusuri: decimal("bonusuri", { precision: 12, scale: 2 }).default("0"),
  alteCosturi: decimal("alte_costuri", { precision: 12, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),

  descriere: text("descriere"),
  documentUrl: varchar("document_url", { length: 500 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSalariuNeproductivSchema = createInsertSchema(salariiNeproductivi).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createSalariuNeproductivSchema = z.object({
  numeAngajat: z.string().min(1, "Numele angajatului este obligatoriu"),
  tipAngajat: z.enum(["PRODUCTIE", "INDIRECT"]),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  salariuBrut: z.string().optional(),
  salariuNet: z.string().optional(),
  bonusuri: z.string().optional(),
  alteCosturi: z.string().optional(),
  totalCost: z.string().optional(),
  descriere: z.string().optional(),
  documentUrl: z.string().optional(),
});

export const updateSalariuNeproductivSchema = createSalariuNeproductivSchema.partial();

export type SalariuNeproductiv = typeof salariiNeproductivi.$inferSelect;
export type InsertSalariuNeproductiv = z.infer<typeof insertSalariuNeproductivSchema>;
export type CreateSalariuNeproductiv = z.infer<typeof createSalariuNeproductivSchema>;
export type UpdateSalariuNeproductiv = z.infer<typeof updateSalariuNeproductivSchema>;

// ============ EMPLOYEES ============

export const employees = pgTable("employees", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  type: employeeTypeEnum("type").notNull(),
  showroomId: varchar("showroom_id", { length: 36 }), // Optional, mostly for Agents
  userId: integer("user_id"), // Optional link to login account
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees);
// No omit needed if we handle it in storage or if Drizzle handles it

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  type: z.enum(["AGENT", "PRODUCTIE", "INDIRECT"]),
  showroomId: z.string().optional().nullable(),
  userId: z.number().optional().nullable(),
  active: z.boolean().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;

// ============ PARTNER MONTHLY DATA (Distributors) ============

export const partnerMonthlyData = pgTable("partner_monthly_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull(),
  luna: integer("luna").notNull(),
  an: integer("an").notNull(),
  venitTva: decimal("venit_tva", { precision: 12, scale: 2 }).default("0"),
  achizitieTva: decimal("achizitie_tva", { precision: 12, scale: 2 }).default("0"),
  comisionPercent: decimal("comision_percent", { precision: 5, scale: 2 }).default("0"),
  cheltuieliMarketing: decimal("cheltuieli_marketing", { precision: 12, scale: 2 }).default("0"),
  costTransport: decimal("cost_transport", { precision: 12, scale: 2 }).default("0"),
  costAmbalare: decimal("cost_ambalare", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPartnerMonthlyDataSchema = createInsertSchema(partnerMonthlyData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createPartnerMonthlyDataSchema = z.object({
  partnerId: z.string().min(1, "ID-ul partenerului este obligatoriu"),
  luna: z.number().min(1).max(12),
  an: z.number().min(2020).max(2100),
  venitTva: z.string().optional(),
  achizitieTva: z.string().optional(),
  comisionPercent: z.string().optional(),
  cheltuieliMarketing: z.string().optional(),
  costTransport: z.string().optional(),
  costAmbalare: z.string().optional(),
});

export const updatePartnerMonthlyDataSchema = createPartnerMonthlyDataSchema.partial();

export type PartnerMonthlyData = typeof partnerMonthlyData.$inferSelect;
export type InsertPartnerMonthlyData = z.infer<typeof insertPartnerMonthlyDataSchema>;
export type CreatePartnerMonthlyData = z.infer<typeof createPartnerMonthlyDataSchema>;
export type UpdatePartnerMonthlyData = z.infer<typeof updatePartnerMonthlyDataSchema>;

// ============ APP SETTINGS ============

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;

