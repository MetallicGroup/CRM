import { 
  users, 
  clients,
  targets,
  partners,
  sedii,
  expenseCategories,
  cheltuieliAgent,
  cheltuieliSediu,
  agentSalesProfitability,
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
  type UpdatePartner,
  type Sediu,
  type CreateSediu,
  type UpdateSediu,
  type ExpenseCategory,
  type CreateExpenseCategory,
  type UpdateExpenseCategory,
  type CheltuialaAgent,
  type CreateCheltuialaAgent,
  type UpdateCheltuialaAgent,
  type CheltuialaSediu,
  type CreateCheltuialaSediu,
  type UpdateCheltuialaSediu,
  type AgentSalesProfitability
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
  getClientByPhone(telefon: string): Promise<Client | undefined>;
  getAllClients(filters?: { agentId?: string; stadiuOferta?: string; search?: string }): Promise<Client[]>;
  createClient(data: CreateClient): Promise<Client>;
  updateClient(id: string, data: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getClientStats(agentId?: string): Promise<{ total: number; byStatus: Record<string, number>; totalValue: number; wonValue: number; pipelineValue: number }>;
  bulkImportClients(rows: Partial<CreateClient>[], agentId?: string, duplicateStrategy?: "skip" | "update"): Promise<{ success: number; errors: number; skipped: number; errorDetails: { row: number; error: string; data: Record<string, string> }[] }>;
  
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
  
  // Sedii methods
  getSediu(id: string): Promise<Sediu | undefined>;
  getAllSedii(activ?: boolean): Promise<Sediu[]>;
  createSediu(data: CreateSediu): Promise<Sediu>;
  updateSediu(id: string, data: UpdateSediu): Promise<Sediu | undefined>;
  deleteSediu(id: string): Promise<boolean>;
  
  // Expense Category methods
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  getExpenseCategoriesByLevel(level: string): Promise<ExpenseCategory[]>;
  getExpenseCategoriesByParent(parentId: string): Promise<ExpenseCategory[]>;
  createExpenseCategory(data: CreateExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, data: UpdateExpenseCategory): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string): Promise<boolean>;
  
  // Cheltuieli Agent methods
  getCheltuialaAgent(id: string): Promise<CheltuialaAgent | undefined>;
  getAllCheltuieliAgent(filters?: { 
    agentId?: string; 
    luna?: number; 
    an?: number; 
    categoryId?: string;
    sediuId?: string;
    firma?: string;
  }): Promise<CheltuialaAgent[]>;
  createCheltuialaAgent(data: CreateCheltuialaAgent): Promise<CheltuialaAgent>;
  updateCheltuialaAgent(id: string, data: UpdateCheltuialaAgent): Promise<CheltuialaAgent | undefined>;
  deleteCheltuialaAgent(id: string): Promise<boolean>;
  getCheltuieliAgentStats(filters?: { agentId?: string; luna?: number; an?: number }): Promise<{ total: number; byCategory: Record<string, number> }>;
  
  // Cheltuieli Sediu methods
  getCheltuialaSediu(id: string): Promise<CheltuialaSediu | undefined>;
  getAllCheltuieliSediu(filters?: { 
    sediuId?: string; 
    luna?: number; 
    an?: number; 
    categoryId?: string;
    firma?: string;
  }): Promise<CheltuialaSediu[]>;
  createCheltuialaSediu(data: CreateCheltuialaSediu): Promise<CheltuialaSediu>;
  updateCheltuialaSediu(id: string, data: UpdateCheltuialaSediu): Promise<CheltuialaSediu | undefined>;
  deleteCheltuialaSediu(id: string): Promise<boolean>;
  getCheltuieliSediuStats(filters?: { sediuId?: string; luna?: number; an?: number }): Promise<{ total: number; byCategory: Record<string, number> }>;
  
  // Profitability integration - aggregate expenses to profitability fields
  getAgentProfitabilityCosts(agentId: string, luna: number, an: number): Promise<{
    salariu: number;
    amortizareAuto: number;
    combustibil: number;
    revizii: number;
    alteCheltuieliAuto: number;
    abonamente: number;
    diurne: number;
    alteCheltuieli: number;
  }>;
  
  // Agent Sales Profitability methods
  recomputeAgentMonthlyProfit(agentId: string, an: number, luna: number): Promise<AgentSalesProfitability>;
  getAgentSalesProfitability(agentId: string, an: number): Promise<AgentSalesProfitability[]>;
  getAllAgentsSalesProfitability(an: number): Promise<AgentSalesProfitability[]>;
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

  async getClientByPhone(telefon: string): Promise<Client | undefined> {
    const normalizedPhone = telefon.replace(/\s+/g, "").trim();
    const [client] = await db.select().from(clients).where(eq(clients.telefon, normalizedPhone));
    return client || undefined;
  }

  async getAllClients(filters?: { agentId?: string; stadiuOferta?: string; search?: string }): Promise<Client[]> {
    let query = db.select().from(clients);
    
    const conditions = [];
    
    if (filters?.agentId) {
      conditions.push(eq(clients.agentId, filters.agentId));
    }
    
    if (filters?.stadiuOferta) {
      conditions.push(eq(clients.stadiuOferta, filters.stadiuOferta as any));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(clients.nume, searchTerm),
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
      telefon: data.telefon,
      email: data.email || null,
      judet: data.judet || null,
      localitate: data.localitate || null,
      sursa: data.sursa || "ALTELE",
      dataAdaugare: parseDate(data.dataAdaugare) || new Date(),
      isPartnerOrder: data.isPartnerOrder || false,
      partnerId: data.partnerId || null,
      categorieProdus: data.categorieProdus || "GARD_METALIC",
      brand: data.brand || null,
      model: data.model || null,
      suprafataMp: parseDecimal(data.suprafataMp),
      culoare: data.culoare || null,
      grosime: data.grosime || null,
      finisaj: data.finisaj || null,
      mlRulouProd: parseDecimal(data.mlRulouProd),
      smartDripstop: data.smartDripstop || false,
      valoareOferta: parseDecimal(data.valoareOferta),
      stadiuOferta: data.stadiuOferta || "NOUA",
      dataOfertarii: parseDate(data.dataOfertarii),
      stadiuComanda: data.stadiuComanda || null,
      dataVanzarii: parseDate(data.dataVanzarii),
      dataLivrarii: parseDate(data.dataLivrarii),
      procentComision: parseDecimal(data.procentComision),
      comisionOferta: parseDecimal(data.comisionOferta),
      incasat: data.incasat || false,
      pretAchizitie: parseDecimal(data.pretAchizitie),
      ofertaFilename: data.ofertaFilename || null,
      ofertaFilename2: data.ofertaFilename2 || null,
      dataRevenire1: parseDate(data.dataRevenire1),
      comentariuObservatii1: data.comentariuObservatii1 || null,
      followUpEfectuat1: data.followUpEfectuat1 || false,
      dataRevenire2: parseDate(data.dataRevenire2),
      comentariuObservatii2: data.comentariuObservatii2 || null,
      followUpEfectuat2: data.followUpEfectuat2 || false,
      dataRevenire3: parseDate(data.dataRevenire3),
      comentariuObservatii3: data.comentariuObservatii3 || null,
      followUpEfectuat3: data.followUpEfectuat3 || false,
      observatiiClient: data.observatiiClient || null,
      comentariiDupaContact: data.comentariiDupaContact || null,
      contactat: data.contactat || false,
      agentId: data.agentId || null,
    };

    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, data: UpdateClient): Promise<Client | undefined> {
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
    if (data.telefon !== undefined) updateData.telefon = data.telefon;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.judet !== undefined) updateData.judet = data.judet || null;
    if (data.localitate !== undefined) updateData.localitate = data.localitate || null;
    if (data.sursa !== undefined) updateData.sursa = data.sursa;
    if (data.dataAdaugare !== undefined) updateData.dataAdaugare = parseDate(data.dataAdaugare);
    if (data.isPartnerOrder !== undefined) updateData.isPartnerOrder = data.isPartnerOrder;
    if (data.partnerId !== undefined) updateData.partnerId = data.partnerId || null;
    if (data.categorieProdus !== undefined) updateData.categorieProdus = data.categorieProdus;
    if (data.brand !== undefined) updateData.brand = data.brand || null;
    if (data.model !== undefined) updateData.model = data.model || null;
    if (data.suprafataMp !== undefined) updateData.suprafataMp = parseDecimal(data.suprafataMp);
    if (data.culoare !== undefined) updateData.culoare = data.culoare || null;
    if (data.grosime !== undefined) updateData.grosime = data.grosime || null;
    if (data.finisaj !== undefined) updateData.finisaj = data.finisaj || null;
    if (data.mlRulouProd !== undefined) updateData.mlRulouProd = parseDecimal(data.mlRulouProd);
    if (data.smartDripstop !== undefined) updateData.smartDripstop = data.smartDripstop;
    if (data.valoareOferta !== undefined) updateData.valoareOferta = parseDecimal(data.valoareOferta);
    if (data.stadiuOferta !== undefined) updateData.stadiuOferta = data.stadiuOferta;
    if (data.dataOfertarii !== undefined) updateData.dataOfertarii = parseDate(data.dataOfertarii);
    if (data.stadiuComanda !== undefined) updateData.stadiuComanda = data.stadiuComanda || null;
    if (data.dataVanzarii !== undefined) updateData.dataVanzarii = parseDate(data.dataVanzarii);
    if (data.dataLivrarii !== undefined) updateData.dataLivrarii = parseDate(data.dataLivrarii);
    if (data.procentComision !== undefined) updateData.procentComision = parseDecimal(data.procentComision);
    if (data.comisionOferta !== undefined) updateData.comisionOferta = parseDecimal(data.comisionOferta);
    if (data.incasat !== undefined) updateData.incasat = data.incasat;
    if (data.pretAchizitie !== undefined) updateData.pretAchizitie = parseDecimal(data.pretAchizitie);
    if (data.ofertaFilename !== undefined) updateData.ofertaFilename = data.ofertaFilename || null;
    if (data.ofertaFilename2 !== undefined) updateData.ofertaFilename2 = data.ofertaFilename2 || null;
    if (data.dataRevenire1 !== undefined) updateData.dataRevenire1 = parseDate(data.dataRevenire1);
    if (data.comentariuObservatii1 !== undefined) updateData.comentariuObservatii1 = data.comentariuObservatii1 || null;
    if (data.followUpEfectuat1 !== undefined) updateData.followUpEfectuat1 = data.followUpEfectuat1;
    if (data.dataRevenire2 !== undefined) updateData.dataRevenire2 = parseDate(data.dataRevenire2);
    if (data.comentariuObservatii2 !== undefined) updateData.comentariuObservatii2 = data.comentariuObservatii2 || null;
    if (data.followUpEfectuat2 !== undefined) updateData.followUpEfectuat2 = data.followUpEfectuat2;
    if (data.dataRevenire3 !== undefined) updateData.dataRevenire3 = parseDate(data.dataRevenire3);
    if (data.comentariuObservatii3 !== undefined) updateData.comentariuObservatii3 = data.comentariuObservatii3 || null;
    if (data.followUpEfectuat3 !== undefined) updateData.followUpEfectuat3 = data.followUpEfectuat3;
    if (data.observatiiClient !== undefined) updateData.observatiiClient = data.observatiiClient || null;
    if (data.comentariiDupaContact !== undefined) updateData.comentariiDupaContact = data.comentariiDupaContact || null;
    if (data.contactat !== undefined) updateData.contactat = data.contactat;
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
      const status = client.stadiuOferta || "NOUA";
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      if (status === "VANDUT" && client.valoareOferta) {
        wonValue += parseFloat(client.valoareOferta);
        totalValue += parseFloat(client.valoareOferta);
      } else if (client.valoareOferta) {
        pipelineValue += parseFloat(client.valoareOferta);
        totalValue += parseFloat(client.valoareOferta);
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

  async bulkImportClients(
    rows: Partial<Record<string, string>>[],
    agentId?: string,
    duplicateStrategy: "skip" | "update" = "skip"
  ): Promise<{ 
    success: number; 
    errors: number; 
    skipped: number; 
    errorDetails: { row: number; error: string; data: Record<string, string> }[] 
  }> {
    let success = 0;
    let errors = 0;
    let skipped = 0;
    const errorDetails: { row: number; error: string; data: Record<string, string> }[] = [];
    const affectedMonths: Set<string> = new Set();
    const finalAgentId = agentId;

    const normalizePhone = (phone: string | undefined): string => {
      if (!phone) return "";
      return phone.replace(/[^\d+]/g, "").replace(/^\+40/, "0").trim();
    };

    const parseDate = (dateStr: string | undefined): Date | undefined => {
      if (!dateStr || dateStr.trim() === "") return undefined;
      const trimmed = dateStr.trim();
      if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        if (parts.length === 3) {
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            return new Date(year, month - 1, day);
          }
        }
      }
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };

    const parseValue = (val: string | undefined): string | undefined => {
      if (!val) return undefined;
      const cleaned = val.replace(/LEI\s*/gi, "").replace(/[,\s]/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num.toString();
    };

    const parsePercent = (val: string | undefined): string | undefined => {
      if (!val) return undefined;
      const cleaned = val.replace(/%/g, "").replace(/,/g, ".").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num.toString();
    };

    const mapStadiuOferta = (status: string | undefined): string | undefined => {
      if (!status) return undefined;
      const s = status.toLowerCase().trim();
      if (s.includes("vandut") || s.includes("vândut")) return "VANDUT";
      if (s.includes("ofertat") || s.includes("trimis")) return "TRIMISA";
      if (s.includes("pierdut") || s.includes("refuzat")) return "REFUZAT";
      if (s.includes("follow") || s.includes("negociere") || s.includes("asteptare")) return "IN_ASTEPTARE";
      if (s.includes("contactat") || s.includes("nou")) return "NOUA";
      if (s.includes("livrat")) return "VANDUT";
      return undefined;
    };

    const mapSursa = (sursa: string | undefined): string | undefined => {
      if (!sursa) return undefined;
      const s = sursa.toLowerCase().trim();
      if (s.includes("facebook") || s.includes("fb")) return "FACEBOOK";
      if (s.includes("google")) return "GOOGLE";
      if (s.includes("olx") || s.includes("reclam")) return "RECLAME";
      if (s.includes("site") || s.includes("cerere oferta")) return "SITE";
      if (s.includes("recomandare") || s.includes("client vechi")) return "RECOMANDARE";
      if (s.includes("targ") || s.includes("expo")) return "TARG";
      if (s.includes("birou") || s.includes("telefon") || s.includes("lead")) return "ALTELE";
      return "ALTELE";
    };

    const parseBool = (val: string | undefined): boolean => {
      if (!val) return false;
      const s = val.toLowerCase().trim();
      return s === "da" || s === "yes" || s === "true" || s === "1" || s === "x" || s === "✓";
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row.nume) {
          errors++;
          errorDetails.push({
            row: rowNum,
            error: "Nume este obligatoriu",
            data: row as Record<string, string>
          });
          continue;
        }

        const normalizedPhone = normalizePhone(row.telefon);
        
        if (normalizedPhone && normalizedPhone !== "#ERROR!") {
          const existingClient = await this.getClientByPhone(normalizedPhone);

          if (existingClient) {
            if (duplicateStrategy === "skip") {
              skipped++;
              continue;
            }
          }
        }

        const stadiuOferta = mapStadiuOferta(row.stadiuOferta);
        const dataVanzarii = parseDate(row.dataVanzarii);
        const dataLivrarii = parseDate(row.dataLivrarii);

        const clientData: any = {
          nume: row.nume.trim(),
          telefon: normalizedPhone || "N/A",
          email: row.email || undefined,
          localitate: row.localitate || undefined,
          judet: row.judet || undefined,
          dataOfertarii: parseDate(row.dataOfertarii),
          sursa: mapSursa(row.sursa),
          mlRulouProd: parseValue(row.mlRulouProd),
          valoareOferta: parseValue(row.valoareOferta),
          categorieProdus: row.categorieProdus?.toUpperCase()?.includes("GARD") ? "GARD" : 
                          row.categorieProdus?.toUpperCase()?.includes("ACOPERIS") ? "ACOPERIS" : undefined,
          brand: row.brand || undefined,
          model: row.model || undefined,
          suprafataMp: parseValue(row.suprafataMp),
          culoare: row.culoare || undefined,
          grosime: row.grosime || undefined,
          finisaj: row.finisaj || undefined,
          smartDripstop: parseBool(row.smartDripstop),
          dataRevenire1: parseDate(row.dataRevenire1),
          comentariuObservatii1: row.comentariuObservatii1 || undefined,
          dataRevenire2: parseDate(row.dataRevenire2),
          comentariuObservatii2: row.comentariuObservatii2 || undefined,
          stadiuOferta: stadiuOferta,
          dataVanzarii: dataVanzarii,
          stadiuComanda: row.stadiuComanda?.toUpperCase()?.includes("LIVRAT") ? "LIVRAT" : 
                         row.stadiuComanda?.toUpperCase()?.includes("PROD") ? "IN_PRODUCTIE" : undefined,
          dataLivrarii: dataLivrarii,
          incasat: parseBool(row.incasat),
          procentComision: parsePercent(row.procentComision),
          agentId: agentId || undefined,
        };

        await this.createClient(clientData);
        
        if (stadiuOferta === "VANDUT" && dataVanzarii && finalAgentId) {
          affectedMonths.add(`${finalAgentId}:${dataVanzarii.getFullYear()}:${dataVanzarii.getMonth() + 1}`);
        }
        success++;
      } catch (error) {
        errors++;
        errorDetails.push({
          row: rowNum,
          error: error instanceof Error ? error.message : "Eroare necunoscută",
          data: row as Record<string, string>
        });
      }
    }

    for (const key of Array.from(affectedMonths)) {
      const [agId, an, luna] = key.split(":");
      try {
        await this.recomputeAgentMonthlyProfit(agId, parseInt(an), parseInt(luna));
      } catch (e) {
        console.error(`Failed to recalculate profitability for ${key}:`, e);
      }
    }

    return { success, errors, skipped, errorDetails };
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
      const status = client.stadiuOferta || "NOUA";
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      if (status === "VANDUT" && client.valoareOferta) {
        wonValue += parseFloat(client.valoareOferta);
        totalValue += parseFloat(client.valoareOferta);
      } else if (client.valoareOferta) {
        pipelineValue += parseFloat(client.valoareOferta);
        totalValue += parseFloat(client.valoareOferta);
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
        eq(clients.stadiuOferta, "VANDUT"),
        gte(clients.updatedAt, startDate),
        lte(clients.updatedAt, endDate)
      )
    );

    let realizedValue = 0;
    for (const client of wonClients) {
      if (client.valoareOferta) {
        realizedValue += parseFloat(client.valoareOferta);
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

  // ============ SEDII METHODS ============

  async getSediu(id: string): Promise<Sediu | undefined> {
    const [sediu] = await db.select().from(sedii).where(eq(sedii.id, id));
    return sediu || undefined;
  }

  async getAllSedii(activ?: boolean): Promise<Sediu[]> {
    if (activ !== undefined) {
      return await db.select().from(sedii).where(eq(sedii.activ, activ)).orderBy(sedii.nume);
    }
    return await db.select().from(sedii).orderBy(sedii.nume);
  }

  async createSediu(data: CreateSediu): Promise<Sediu> {
    const [sediu] = await db.insert(sedii).values({
      nume: data.nume,
      adresa: data.adresa || null,
      oras: data.oras || null,
      judet: data.judet || null,
      telefon: data.telefon || null,
      email: data.email || null,
      activ: data.activ !== undefined ? data.activ : true,
    }).returning();
    return sediu;
  }

  async updateSediu(id: string, data: UpdateSediu): Promise<Sediu | undefined> {
    const updateData: any = {};
    
    if (data.nume !== undefined) updateData.nume = data.nume;
    if (data.adresa !== undefined) updateData.adresa = data.adresa || null;
    if (data.oras !== undefined) updateData.oras = data.oras || null;
    if (data.judet !== undefined) updateData.judet = data.judet || null;
    if (data.telefon !== undefined) updateData.telefon = data.telefon || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.activ !== undefined) updateData.activ = data.activ;

    const [sediu] = await db
      .update(sedii)
      .set(updateData)
      .where(eq(sedii.id, id))
      .returning();
    
    return sediu || undefined;
  }

  async deleteSediu(id: string): Promise<boolean> {
    const result = await db.delete(sedii).where(eq(sedii.id, id)).returning();
    return result.length > 0;
  }

  // ============ EXPENSE CATEGORY METHODS ============

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    return category || undefined;
  }

  async getExpenseCategoriesByLevel(level: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories)
      .where(and(
        eq(expenseCategories.level, level as any),
        eq(expenseCategories.active, true)
      ))
      .orderBy(expenseCategories.displayOrder);
  }

  async getExpenseCategoriesByParent(parentId: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories)
      .where(and(
        eq(expenseCategories.parentId, parentId),
        eq(expenseCategories.active, true)
      ))
      .orderBy(expenseCategories.displayOrder);
  }

  async createExpenseCategory(data: CreateExpenseCategory): Promise<ExpenseCategory> {
    const [category] = await db.insert(expenseCategories).values({
      name: data.name,
      parentId: data.parentId || null,
      level: data.level as any,
      active: data.active !== undefined ? data.active : true,
      displayOrder: data.displayOrder || 0,
    }).returning();
    return category;
  }

  async updateExpenseCategory(id: string, data: UpdateExpenseCategory): Promise<ExpenseCategory | undefined> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    const [category] = await db
      .update(expenseCategories)
      .set(updateData)
      .where(eq(expenseCategories.id, id))
      .returning();
    
    return category || undefined;
  }

  async deleteExpenseCategory(id: string): Promise<boolean> {
    const result = await db.delete(expenseCategories).where(eq(expenseCategories.id, id)).returning();
    return result.length > 0;
  }

  // ============ CHELTUIELI AGENT METHODS ============

  async getCheltuialaAgent(id: string): Promise<CheltuialaAgent | undefined> {
    const [cheltuiala] = await db.select().from(cheltuieliAgent).where(eq(cheltuieliAgent.id, id));
    return cheltuiala || undefined;
  }

  async getAllCheltuieliAgent(filters?: { 
    agentId?: string; 
    luna?: number; 
    an?: number; 
    categoryId?: string;
    sediuId?: string;
    firma?: string;
  }): Promise<CheltuialaAgent[]> {
    const conditions = [];
    
    if (filters?.agentId) {
      conditions.push(eq(cheltuieliAgent.agentId, filters.agentId));
    }
    if (filters?.luna) {
      conditions.push(eq(cheltuieliAgent.luna, filters.luna));
    }
    if (filters?.an) {
      conditions.push(eq(cheltuieliAgent.an, filters.an));
    }
    if (filters?.categoryId) {
      conditions.push(eq(cheltuieliAgent.categoryId, filters.categoryId));
    }
    if (filters?.sediuId) {
      conditions.push(eq(cheltuieliAgent.sediuId, filters.sediuId));
    }
    if (filters?.firma) {
      conditions.push(eq(cheltuieliAgent.firma, filters.firma));
    }

    let query = db.select().from(cheltuieliAgent);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(cheltuieliAgent.dataCheltuiala));
  }

  async createCheltuialaAgent(data: CreateCheltuialaAgent): Promise<CheltuialaAgent> {
    const dataCheltuiala = new Date(data.dataCheltuiala);
    
    const [cheltuiala] = await db.insert(cheltuieliAgent).values({
      agentId: data.agentId || null,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      detailCategoryId: data.detailCategoryId || null,
      suma: data.suma,
      descriere: data.descriere || null,
      dataCheltuiala: dataCheltuiala,
      luna: data.luna,
      an: data.an,
      judet: data.judet || null,
      sediuId: data.sediuId || null,
      firma: data.firma,
      autoNr: data.autoNr || null,
      facturaFilename: data.facturaFilename || null,
      tipCheltuiala: data.tipCheltuiala || null,
    }).returning();
    return cheltuiala;
  }

  async updateCheltuialaAgent(id: string, data: UpdateCheltuialaAgent): Promise<CheltuialaAgent | undefined> {
    const updateData: any = {};
    
    if (data.agentId !== undefined) updateData.agentId = data.agentId || null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.subcategoryId !== undefined) updateData.subcategoryId = data.subcategoryId;
    if (data.detailCategoryId !== undefined) updateData.detailCategoryId = data.detailCategoryId || null;
    if (data.suma !== undefined) updateData.suma = data.suma;
    if (data.descriere !== undefined) updateData.descriere = data.descriere || null;
    if (data.dataCheltuiala !== undefined) {
      updateData.dataCheltuiala = new Date(data.dataCheltuiala);
    }
    if (data.luna !== undefined) updateData.luna = data.luna;
    if (data.an !== undefined) updateData.an = data.an;
    if (data.judet !== undefined) updateData.judet = data.judet || null;
    if (data.sediuId !== undefined) updateData.sediuId = data.sediuId || null;
    if (data.firma !== undefined) updateData.firma = data.firma;
    if (data.autoNr !== undefined) updateData.autoNr = data.autoNr || null;
    if (data.facturaFilename !== undefined) updateData.facturaFilename = data.facturaFilename || null;
    if (data.tipCheltuiala !== undefined) updateData.tipCheltuiala = data.tipCheltuiala || null;

    const [cheltuiala] = await db
      .update(cheltuieliAgent)
      .set(updateData)
      .where(eq(cheltuieliAgent.id, id))
      .returning();
    
    return cheltuiala || undefined;
  }

  async deleteCheltuialaAgent(id: string): Promise<boolean> {
    const result = await db.delete(cheltuieliAgent).where(eq(cheltuieliAgent.id, id)).returning();
    return result.length > 0;
  }

  async getCheltuieliAgentStats(filters?: { agentId?: string; luna?: number; an?: number }): Promise<{ 
    total: number; 
    byCategory: Record<string, number>;
  }> {
    const conditions = [];
    
    if (filters?.agentId) {
      conditions.push(eq(cheltuieliAgent.agentId, filters.agentId));
    }
    if (filters?.luna) {
      conditions.push(eq(cheltuieliAgent.luna, filters.luna));
    }
    if (filters?.an) {
      conditions.push(eq(cheltuieliAgent.an, filters.an));
    }

    let query = db.select().from(cheltuieliAgent);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allCheltuieli = await query;
    
    let total = 0;
    const byCategory: Record<string, number> = {};
    
    for (const c of allCheltuieli) {
      const suma = parseFloat(c.suma || "0");
      total += suma;
      
      if (c.categoryId) {
        byCategory[c.categoryId] = (byCategory[c.categoryId] || 0) + suma;
      }
    }
    
    return { total, byCategory };
  }

  // ============ CHELTUIELI SEDIU METHODS ============

  async getCheltuialaSediu(id: string): Promise<CheltuialaSediu | undefined> {
    const [cheltuiala] = await db.select().from(cheltuieliSediu).where(eq(cheltuieliSediu.id, id));
    return cheltuiala || undefined;
  }

  async getAllCheltuieliSediu(filters?: { 
    sediuId?: string; 
    luna?: number; 
    an?: number; 
    categoryId?: string;
    firma?: string;
  }): Promise<CheltuialaSediu[]> {
    const conditions = [];
    
    if (filters?.sediuId) {
      conditions.push(eq(cheltuieliSediu.sediuId, filters.sediuId));
    }
    if (filters?.luna) {
      conditions.push(eq(cheltuieliSediu.luna, filters.luna));
    }
    if (filters?.an) {
      conditions.push(eq(cheltuieliSediu.an, filters.an));
    }
    if (filters?.categoryId) {
      conditions.push(eq(cheltuieliSediu.categoryId, filters.categoryId));
    }
    if (filters?.firma) {
      conditions.push(eq(cheltuieliSediu.firma, filters.firma));
    }

    let query = db.select().from(cheltuieliSediu);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(cheltuieliSediu.dataCheltuiala));
  }

  async createCheltuialaSediu(data: CreateCheltuialaSediu): Promise<CheltuialaSediu> {
    const dataCheltuiala = new Date(data.dataCheltuiala);
    
    const [cheltuiala] = await db.insert(cheltuieliSediu).values({
      sediuId: data.sediuId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      detailCategoryId: data.detailCategoryId || null,
      suma: data.suma,
      descriere: data.descriere || null,
      dataCheltuiala: dataCheltuiala,
      luna: data.luna,
      an: data.an,
      firma: data.firma,
      facturaFilename: data.facturaFilename || null,
      tipCheltuiala: data.tipCheltuiala || null,
    }).returning();
    return cheltuiala;
  }

  async updateCheltuialaSediu(id: string, data: UpdateCheltuialaSediu): Promise<CheltuialaSediu | undefined> {
    const updateData: any = {};
    
    if (data.sediuId !== undefined) updateData.sediuId = data.sediuId;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.subcategoryId !== undefined) updateData.subcategoryId = data.subcategoryId;
    if (data.detailCategoryId !== undefined) updateData.detailCategoryId = data.detailCategoryId || null;
    if (data.suma !== undefined) updateData.suma = data.suma;
    if (data.descriere !== undefined) updateData.descriere = data.descriere || null;
    if (data.dataCheltuiala !== undefined) {
      updateData.dataCheltuiala = new Date(data.dataCheltuiala);
    }
    if (data.luna !== undefined) updateData.luna = data.luna;
    if (data.an !== undefined) updateData.an = data.an;
    if (data.firma !== undefined) updateData.firma = data.firma;
    if (data.facturaFilename !== undefined) updateData.facturaFilename = data.facturaFilename || null;
    if (data.tipCheltuiala !== undefined) updateData.tipCheltuiala = data.tipCheltuiala || null;

    const [cheltuiala] = await db
      .update(cheltuieliSediu)
      .set(updateData)
      .where(eq(cheltuieliSediu.id, id))
      .returning();
    
    return cheltuiala || undefined;
  }

  async deleteCheltuialaSediu(id: string): Promise<boolean> {
    const result = await db.delete(cheltuieliSediu).where(eq(cheltuieliSediu.id, id)).returning();
    return result.length > 0;
  }

  async getCheltuieliSediuStats(filters?: { sediuId?: string; luna?: number; an?: number }): Promise<{ 
    total: number; 
    byCategory: Record<string, number>;
  }> {
    const conditions = [];
    
    if (filters?.sediuId) {
      conditions.push(eq(cheltuieliSediu.sediuId, filters.sediuId));
    }
    if (filters?.luna) {
      conditions.push(eq(cheltuieliSediu.luna, filters.luna));
    }
    if (filters?.an) {
      conditions.push(eq(cheltuieliSediu.an, filters.an));
    }

    let query = db.select().from(cheltuieliSediu);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allCheltuieli = await query;
    
    let total = 0;
    const byCategory: Record<string, number> = {};
    
    for (const c of allCheltuieli) {
      const suma = parseFloat(c.suma || "0");
      total += suma;
      
      if (c.categoryId) {
        byCategory[c.categoryId] = (byCategory[c.categoryId] || 0) + suma;
      }
    }
    
    return { total, byCategory };
  }

  // Profitability integration - aggregate expenses by subcategory and map to profitability fields
  async getAgentProfitabilityCosts(agentId: string, luna: number, an: number): Promise<{
    salariu: number;
    amortizareAuto: number;
    combustibil: number;
    revizii: number;
    alteCheltuieliAuto: number;
    abonamente: number;
    diurne: number;
    alteCheltuieli: number;
  }> {
    // Get all expenses for this agent in the specified month/year
    const expenses = await db.select().from(cheltuieliAgent).where(
      and(
        eq(cheltuieliAgent.agentId, agentId),
        eq(cheltuieliAgent.luna, luna),
        eq(cheltuieliAgent.an, an)
      )
    );

    // Initialize result with zeros
    const result = {
      salariu: 0,
      amortizareAuto: 0,
      combustibil: 0,
      revizii: 0,
      alteCheltuieliAuto: 0,
      abonamente: 0,
      diurne: 0,
      alteCheltuieli: 0,
    };

    // Get all subcategories to build the mapping
    const allSubcategories = await db.select().from(expenseCategories).where(
      eq(expenseCategories.level, "sub")
    );

    // Create a map of subcategory ID to name for faster lookup
    const subcategoryNames: Record<string, string> = {};
    for (const cat of allSubcategories) {
      subcategoryNames[cat.id] = cat.name.toLowerCase();
    }

    // Process each expense and map to the appropriate profitability field
    for (const expense of expenses) {
      const suma = parseFloat(expense.suma || "0");
      const subcategoryId = expense.subcategoryId;
      
      if (!subcategoryId) {
        // If no subcategory, check main category
        if (expense.categoryId === "cat-salarii") {
          result.salariu += suma;
        } else if (expense.categoryId === "cat-auto") {
          result.alteCheltuieliAuto += suma;
        } else if (expense.categoryId === "cat-generale") {
          result.alteCheltuieli += suma;
        }
        continue;
      }

      const subcategoryName = subcategoryNames[subcategoryId] || "";

      // Mapping based on subcategory name (case-insensitive)
      if (subcategoryName.includes("salariu") || subcategoryName.includes("salarii") || 
          subcategoryName.includes("comision") || subcategoryName.includes("bonuri")) {
        // Salarii + bonusuri → salariu
        result.salariu += suma;
      } else if (subcategoryName.includes("combustibil")) {
        result.combustibil += suma;
      } else if (subcategoryName.includes("revizii")) {
        result.revizii += suma;
      } else if (subcategoryName.includes("asigur")) {
        // Asigurări → alteCheltuieliAuto
        result.alteCheltuieliAuto += suma;
      } else if (subcategoryName.includes("leasing")) {
        // Leasing → amortizareAuto
        result.amortizareAuto += suma;
      } else if (subcategoryName.includes("rovinieta")) {
        // Rovinieta → alteCheltuieliAuto
        result.alteCheltuieliAuto += suma;
      } else if (subcategoryName.includes("telefon")) {
        // Telefon → abonamente
        result.abonamente += suma;
      } else if (subcategoryName.includes("deplasări") || subcategoryName.includes("deplasari")) {
        // Deplasări → diurne
        result.diurne += suma;
      } else if (subcategoryName.includes("materiale") || subcategoryName.includes("protocol") || 
                 subcategoryName.includes("alte cheltuieli") || subcategoryName.includes("echipament") ||
                 subcategoryName.includes("cota parte") || subcategoryName.includes("marketing") ||
                 subcategoryName.includes("investiții") || subcategoryName.includes("protecția") ||
                 subcategoryName.includes("contabil") || subcategoryName.includes("angajații") ||
                 subcategoryName.includes("credite")) {
        // General expenses → alteCheltuieli
        result.alteCheltuieli += suma;
      } else {
        // Default: put in alteCheltuieli
        result.alteCheltuieli += suma;
      }
    }

    return result;
  }

  // ============ AGENT SALES PROFITABILITY METHODS ============

  async recomputeAgentMonthlyProfit(agentId: string, an: number, luna: number): Promise<AgentSalesProfitability> {
    // Get all VANDUT clients for this agent in the specified month/year
    const soldClients = await db.select().from(clients).where(
      and(
        eq(clients.agentId, agentId),
        eq(clients.stadiuOferta, "VANDUT"),
        sql`EXTRACT(MONTH FROM ${clients.dataVanzarii}) = ${luna}`,
        sql`EXTRACT(YEAR FROM ${clients.dataVanzarii}) = ${an}`
      )
    );

    // Initialize aggregates
    let venitGard = 0;
    let achizitieGard = 0;
    let comisionGard = 0;
    let nrVanzariGard = 0;
    
    let venitAcoperis = 0;
    let achizitieAcoperis = 0;
    let comisionAcoperis = 0;
    let nrVanzariAcoperis = 0;
    
    // For weighted average commission calculation
    let totalValoareOferta = 0;
    let totalComisionOferta = 0;

    // Aggregate sales by category
    for (const client of soldClients) {
      const valoare = parseFloat(client.valoareOferta || "0");
      const achizitie = parseFloat(client.pretAchizitie || "0");
      const comision = parseFloat(client.comisionOferta || "0");
      
      // Track totals for weighted average commission
      totalValoareOferta += valoare;
      totalComisionOferta += comision;
      
      if (client.categorieProdus === "GARD") {
        venitGard += valoare;
        achizitieGard += achizitie;
        comisionGard += comision;
        nrVanzariGard++;
      } else {
        // All other categories go to Acoperis (ACOPERIS, RULOURI_EXTERIOARE, FATADA, SISTEM_PLUVIAL, etc.)
        venitAcoperis += valoare;
        achizitieAcoperis += achizitie;
        comisionAcoperis += comision;
        nrVanzariAcoperis++;
      }
    }

    // Calculate adaos (margin)
    const adaosGard = venitGard - achizitieGard;
    const adaosAcoperis = venitAcoperis - achizitieAcoperis;
    
    // Calculate venitTvaTotal (sum of all revenues)
    const venitTvaTotal = venitGard + venitAcoperis;
    
    // Calculate weighted average commission percentage
    // Formula: (Σ comisionOferta / Σ valoareOferta) * 100
    const comisionPercentMediu = totalValoareOferta > 0 
      ? (totalComisionOferta / totalValoareOferta) * 100 
      : 0;

    // Upsert the profitability record
    const [existing] = await db.select().from(agentSalesProfitability).where(
      and(
        eq(agentSalesProfitability.agentId, agentId),
        eq(agentSalesProfitability.an, an),
        eq(agentSalesProfitability.luna, luna)
      )
    );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(agentSalesProfitability)
        .set({
          venitGard: venitGard.toFixed(2),
          achizitieGard: achizitieGard.toFixed(2),
          adaosGard: adaosGard.toFixed(2),
          comisionGard: comisionGard.toFixed(2),
          venitAcoperis: venitAcoperis.toFixed(2),
          achizitieAcoperis: achizitieAcoperis.toFixed(2),
          adaosAcoperis: adaosAcoperis.toFixed(2),
          comisionAcoperis: comisionAcoperis.toFixed(2),
          nrVanzariGard,
          nrVanzariAcoperis,
          venitTvaTotal: venitTvaTotal.toFixed(2),
          comisionPercentMediu: comisionPercentMediu.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(agentSalesProfitability.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db
        .insert(agentSalesProfitability)
        .values({
          agentId,
          an,
          luna,
          venitGard: venitGard.toFixed(2),
          achizitieGard: achizitieGard.toFixed(2),
          adaosGard: adaosGard.toFixed(2),
          comisionGard: comisionGard.toFixed(2),
          venitAcoperis: venitAcoperis.toFixed(2),
          achizitieAcoperis: achizitieAcoperis.toFixed(2),
          adaosAcoperis: adaosAcoperis.toFixed(2),
          comisionAcoperis: comisionAcoperis.toFixed(2),
          nrVanzariGard,
          nrVanzariAcoperis,
          venitTvaTotal: venitTvaTotal.toFixed(2),
          comisionPercentMediu: comisionPercentMediu.toFixed(2),
        })
        .returning();
      return created;
    }
  }

  async getAgentSalesProfitability(agentId: string, an: number): Promise<AgentSalesProfitability[]> {
    return db.select().from(agentSalesProfitability).where(
      and(
        eq(agentSalesProfitability.agentId, agentId),
        eq(agentSalesProfitability.an, an)
      )
    );
  }

  async getAllAgentsSalesProfitability(an: number): Promise<AgentSalesProfitability[]> {
    return db.select().from(agentSalesProfitability).where(
      eq(agentSalesProfitability.an, an)
    );
  }
}

export const storage = new DatabaseStorage();
