import {
  users,
  clients,
  targets,
  tasks,
  partners,
  sedii,
  expenseCategories,
  cheltuieliAgent,
  cheltuieliSediu,
  agentSalesProfitability,
  agentManualAchizitii,
  agentFixedCosts,
  salariiNeproductivi,
  employees,
  partnerMonthlyData,
  appSettings,
  activityLogs,
  crmMessages,
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
  type Task,
  type CreateTask,
  type UpdateTask,
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
  type AgentSalesProfitability,
  type AgentManualAchizitii,
  type AgentFixedCosts,
  type SalariuNeproductiv,
  type CreateSalariuNeproductiv,
  type UpdateSalariuNeproductiv,
  type Employee,
  type CreateEmployee,
  type UpdateEmployee,
  type PartnerMonthlyData,
  type CreatePartnerMonthlyData,
  type UpdatePartnerMonthlyData,
  type AppSetting,
  documente,
  type Document,
  type CreateDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike, sql, gte, lte, gt, ne, isNotNull, isNull, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
  getAllClients(filters?: { agentId?: string; stadiuOferta?: string; search?: string; underObservation?: boolean; dateFrom?: string; dateTo?: string }): Promise<Client[]>;
  getFollowupsForDate(agentId: string | undefined, date: Date): Promise<Client[]>;
  createClient(data: CreateClient): Promise<Client>;
  updateClient(id: string, data: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getClientStats(agentId?: string, dateFrom?: string, dateTo?: string): Promise<{ total: number; byStatus: Record<string, number>; totalValue: number; wonValue: number; pipelineValue: number }>;
  getDashboardTodayStats(agentId: string | undefined, dayStart: Date, dayEnd: Date): Promise<{
    clientiNoi: number;
    oferteTrimise: number;
    valoareOferte: number;
    followUpEfectuat: number;
    vanzariNr: number;
    vanzariValoare: number;
    refuzuriNr: number;
    refuzuriValoare: number;
  }>;
  bulkImportClients(rows: Partial<CreateClient>[], agentId?: string, duplicateStrategy?: "skip" | "update" | "create"): Promise<{ success: number; errors: number; skipped: number; errorDetails: { row: number; error: string; data: Record<string, string> }[] }>;
  bulkImportAgentFixedCosts(rows: any[]): Promise<{ success: number; errors: number }>;
  getNextCriteriumNumber(agentId: string): Promise<number>;

  // Employee methods
  getEmployee(id: string): Promise<Employee | undefined>;
  getAllEmployees(filters?: { type?: string; active?: boolean }): Promise<Employee[]>;
  createEmployee(data: CreateEmployee): Promise<Employee>;
  updateEmployee(id: string, data: UpdateEmployee): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Partner Monthly Data methods
  getPartnerMonthlyData(partnerId: string, luna: number, an: number): Promise<PartnerMonthlyData | undefined>;
  getAllPartnerMonthlyData(filters?: { partnerId?: string; luna?: number; an?: number }): Promise<PartnerMonthlyData[]>;
  upsertPartnerMonthlyData(data: CreatePartnerMonthlyData): Promise<PartnerMonthlyData>;

  // App Settings methods
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  updateAppSetting(key: string, value: string, description?: string): Promise<AppSetting>;

  // Centralized Financial Calculation
  getFinancialReport(luna: number, an: number): Promise<any>;

  // Partner comisionari report
  getPartnerSalesForPeriod(partnerId: string, luna: number, an: number): Promise<{
    id: string;
    nume: string;
    dataVanzarii: Date | null;
    valoareOferta: string | null;
    pretAchizitie: string | null;
    achizitiePartener: string | null;
  }[]>;

  // Dashboard methods
  getActiveAgentsCount(): Promise<number>;
  getAgents(): Promise<SafeUser[]>;
  getChatUsers(): Promise<SafeUser[]>;
  getClientStatsWithPeriod(agentId?: string, startDate?: Date, endDate?: Date): Promise<{ total: number; byStatus: Record<string, number>; totalValue: number; wonValue: number; pipelineValue: number }>;
  registerClientCall(clientId: string, userId: string): Promise<void>;

  // Target methods
  getTarget(id: string): Promise<Target | undefined>;
  getAllTargets(filters?: { agentId?: string; luna?: number; an?: number }): Promise<Target[]>;
  createTarget(data: CreateTarget): Promise<Target>;
  updateTarget(id: string, data: UpdateTarget): Promise<Target | undefined>;
  deleteTarget(id: string): Promise<boolean>;
  getTargetProgress(agentId: string, luna: number, an: number): Promise<{ target: Target | null; realizedValue: number; realizedClients: number }>;
  getTargetDetailedProgress(targetId: string): Promise<{
    target: Target | null;
    progress: {
      realizedValue: number;
      realizedVanzariNr: number;
      realizedClientiContactati: number;
      realizedOferteTransmise: number;
      realizedFollowUp: number;
      realizedConversie: number | null;
      realizedClientiNoi: number;
      realizedColaboratoriNoi: number;
      realizedPartenerActiv: number;
    };
  }>;

  // Task / Proiecte methods
  getTask(id: string): Promise<Task | undefined>;
  getAllTasks(filters?: { assignedAgentId?: string; createdById?: string }): Promise<Task[]>;
  createTask(data: CreateTask): Promise<Task>;
  updateTask(id: string, data: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Documentație
  createDocument(data: CreateDocument): Promise<Document>;
  getDocumente(filters?: { categorie?: string }): Promise<(Document & { uploadedByFirstName?: string; uploadedByLastName?: string })[]>;
  deleteDocument(id: string): Promise<boolean>;

  // Partner methods
  getPartner(id: string): Promise<Partner | undefined>;
  getAllPartners(filters?: { tipPartener?: string; activ?: boolean; search?: string }): Promise<Partner[]>;
  getOrCreatePartnerId(idOrNume: string): Promise<string | null>;
  createPartner(data: CreatePartner): Promise<Partner>;
  updatePartner(id: string, data: UpdatePartner): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<boolean>;

  // CRM Chat
  createCrmMessage(senderId: string, recipientId: string, body: string): Promise<{ id: string; senderId: string; recipientId: string; body: string; readAt: Date | null; createdAt: Date }>;
  getCrmMessagesBetween(userId: string, otherUserId: string, limit?: number): Promise<{ id: string; senderId: string; recipientId: string; body: string; readAt: Date | null; createdAt: Date }[]>;
  getUnreadMessageCount(userId: string): Promise<number>;
  getConversationsForUser(userId: string): Promise<{ userId: string; firstName: string; lastName: string; lastMessage: string | null; lastAt: Date | null; unread: number }[]>;
  getAllConversationsAdmin(): Promise<{ user1: SafeUser; user2: SafeUser; lastMessage: string | null; lastAt: Date | null }[]>;
  markCrmMessagesAsRead(recipientId: string, senderId: string): Promise<void>;
  getRecentLeadsForNotifications(limit?: number, todayOnly?: boolean): Promise<{ id: string; nume: string; sursa: string; dataAdaugare: Date | null; dataOfertarii: Date | null }[]>;

  // Activity logs
  createActivityLog(data: {
    userId: string;
    clientId: string;
    type: "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK";
    meta?: Record<string, unknown>;
  }): Promise<void>;
  getAgentActivitySummary(params: {
    agentId: string;
    from: Date;
    to: Date;
  }): Promise<{
    totalLeadsAuto: number;
    totalLeadsManual: number;
    totalPhoneClicks: number;
    totalStatusChanges: number;
    totalFollowupClicks: number;
    totalInactivitySeconds: number;
    inactivityIntervals: Array<{ start: string; end: string; duration: string }>;
  }>;
  getAgentActivityDetails(params: {
    agentId: string;
    from: Date;
    to: Date;
    ownerAgentId?: string;
  }): Promise<Array<{
    id: string;
    clientId: string;
    clientName: string;
    clientPhone: string | null;
    type: "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK";
    createdAt: Date;
    meta: Record<string, unknown> | null;
  }>>;

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

  // Showroom profitability costs
  getShowroomProfitabilityCosts(luna: number, an: number): Promise<Record<string, {
    sediuName: string;
    chirie: number;
    utilitati: number;
    marketing: number;
    consumabile: number;
    alteCheltuieli: number;
    total: number;
    cheltuieliAgenti: number;
    salarii: number;
    combustibil: number;
    auto: number;
  }>>;

  // Showroom costs distributed to agents
  getShowroomCostsDistributedToAgents(luna: number, an: number): Promise<Record<string, {
    agentId: string;
    agentName: string;
    sediuId: string;
    sediuName: string;
    costuriShowroomDistribuite: number;
  }>>;

  // Agent Manual Acquisitions methods
  getAgentManualAchizitii(agentId: string, an: number): Promise<AgentManualAchizitii[]>;
  getAllAgentsManualAchizitii(an: number): Promise<AgentManualAchizitii[]>;
  upsertAgentManualAchizitii(data: { agentId: string; luna: number; an: number; achizitieGard?: string; achizitieAcoperis?: string }): Promise<AgentManualAchizitii>;

  // Agent Fixed Costs methods
  getAgentFixedCosts(agentId: string, an: number): Promise<AgentFixedCosts[]>;
  getAllAgentsFixedCosts(an: number): Promise<AgentFixedCosts[]>;
  upsertAgentFixedCosts(data: {
    agentId: string;
    luna: number;
    an: number;
    salariu?: string;
    amortizareAuto?: string;
    combustibil?: string;
    revizii?: string;
    alteCheltuieliAuto?: string;
    abonamente?: string;
    diurne?: string;
    alteCheltuieli?: string;
  }): Promise<AgentFixedCosts>;

  // Salarii Neproductivi methods
  getSalariuNeproductiv(id: string): Promise<SalariuNeproductiv | undefined>;
  getAllSalariiNeproductivi(filters?: {
    tipAngajat?: string;
    luna?: number;
    an?: number;
    numeAngajat?: string;
  }): Promise<SalariuNeproductiv[]>;
  createSalariuNeproductiv(data: CreateSalariuNeproductiv): Promise<SalariuNeproductiv>;
  updateSalariuNeproductiv(id: string, data: UpdateSalariuNeproductiv): Promise<SalariuNeproductiv | undefined>;
  deleteSalariuNeproductiv(id: string): Promise<boolean>;
  getSalariiNeproductiviTotals(luna: number, an: number): Promise<{
    totalProductie: number;
    totalIndirect: number;
    totalGeneral: number;
    byAngajat: Record<string, number>;
  }>;
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

  async getAllClients(filters?: { agentId?: string; stadiuOferta?: string; search?: string; underObservation?: boolean; dateFrom?: string; dateTo?: string }): Promise<Client[]> {
    let query = db.select().from(clients);

    const conditions = [];

    if (filters?.agentId) {
      // When filtering by agentId, ensure we only get clients assigned to that agent
      // and exclude clients with null agentId
      conditions.push(eq(clients.agentId, filters.agentId));
      conditions.push(isNotNull(clients.agentId));
    }

    if (filters?.stadiuOferta) {
      conditions.push(eq(clients.stadiuOferta, filters.stadiuOferta as any));
    }

    if (filters?.underObservation !== undefined) {
      conditions.push(eq(clients.underObservation, filters.underObservation));
    }

    if (filters?.search) {
      const rawSearch = filters.search.trim();
      const searchTerm = `%${rawSearch}%`;
      const digitsOnly = rawSearch.replace(/\D+/g, "");

      const phoneConditions: any[] = [ilike(clients.telefon, searchTerm)];
      if (digitsOnly.length >= 4) {
        phoneConditions.push(
          sql`regexp_replace(${clients.telefon}, '\\D+', '', 'g') ILIKE ${"%" + digitsOnly + "%"}`
        );
      }

      conditions.push(
        or(
          ilike(clients.nume, searchTerm),
          or(...phoneConditions),
          ilike(clients.email, searchTerm),
          ilike(clients.localitate, searchTerm)
        )
      );
    }

    // Pentru VANDUT: folosim COALESCE(dataVanzarii, updatedAt) ca vânzările fără data_vanzarii setată
    // să apară tot (folosim updatedAt = când a fost marcat ca vândut)
    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      conditions.push(
        sql`(COALESCE(${clients.dataVanzarii}, ${clients.updatedAt}) >= ${fromDate})`
      );
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(
        sql`(COALESCE(${clients.dataVanzarii}, ${clients.updatedAt}) <= ${toDate})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(clients.createdAt));
  }

  async getFollowupsForDate(agentId: string | undefined, date: Date): Promise<Client[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const conditions: any[] = [];

    if (agentId) {
      conditions.push(eq(clients.agentId, agentId));
      conditions.push(isNotNull(clients.agentId));
    }

    // Exclude refuzate și anulate – nu apar în follow-up
    conditions.push(ne(clients.stadiuOferta, "REFUZAT"));
    conditions.push(ne(clients.stadiuOferta, "ANULATA"));

    // orice follow-up 1/2/3 care pică în ziua selectată
    conditions.push(
      or(
        and(gte(clients.dataRevenire1, dayStart), lte(clients.dataRevenire1, dayEnd)),
        and(gte(clients.dataRevenire2, dayStart), lte(clients.dataRevenire2, dayEnd)),
        and(gte(clients.dataRevenire3, dayStart), lte(clients.dataRevenire3, dayEnd)),
      )
    );

    let query = db.select().from(clients);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(asc(clients.nume));
  }

  async createClient(data: CreateClient): Promise<Client> {
    const parseDecimal = (val: string | undefined): string | null => {
      if (!val || val === "") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num.toString();
    };

    const parseDate = (val: string | undefined): Date | null => {
      if (!val || val === "") return null;
      const [yearStr, monthStr, dayStr] = val.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const day = Number(dayStr);
      if (!year || !month || !day) return null;
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    };

    // Check if this client is for Alexandru Croitoru and assign criteriu number
    let numCriteriu: number | null = null;
    if (data.agentId) {
      const agent = await this.getUser(data.agentId);
      if (agent && (
        agent.email === 'alexandru@metallicgroup.ro' ||
        (agent.firstName.toLowerCase().includes('alexandru') && agent.lastName.toLowerCase().includes('croitoru'))
      )) {
        numCriteriu = await this.getNextCriteriumNumber(data.agentId);
      }
    }

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
      categorieProdus: data.categorieProdus || "GARD",
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
      avans: data.avans || false,
      avansSuma: parseDecimal(data.avansSuma),
      avansIncasat: data.avansIncasat || false,
      stadiuComanda: data.stadiuComanda || null,
      dataVanzarii: parseDate(data.dataVanzarii),
      dataLivrarii: parseDate(data.dataLivrarii),
      procentComision: data.procentComision !== undefined && data.procentComision !== "" ? String(data.procentComision).trim() : null,
      comisionOferta: parseDecimal(data.comisionOferta),
      incasat: data.incasat || false,
      pretAchizitie: parseDecimal(data.pretAchizitie),
      achizitiePartener: parseDecimal((data as any).achizitiePartener),
      ofertaFilename: data.ofertaFilename || null,
      ofertaFilename2: data.ofertaFilename2 || null,
      ofertaFilename3: (data as any).ofertaFilename3 || null,
      // Auto-set dataRevenire1 to next day if status is IN_ASTEPTARE and dataRevenire1 is not provided
      dataRevenire1: parseDate(data.dataRevenire1) || (data.stadiuOferta === "IN_ASTEPTARE" ? (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      })() : null),
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
      underObservation: data.underObservation || false,
      urgenta: data.urgenta ?? (data.prioritate === "URGENT"),
      prioritate: data.prioritate || null,
      agentId: data.agentId || null,
      numCriteriu: numCriteriu,
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
      const [yearStr, monthStr, dayStr] = val.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const day = Number(dayStr);
      if (!year || !month || !day) return null;
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
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
    if (data.avansSuma !== undefined) updateData.avansSuma = parseDecimal(data.avansSuma);
    if (data.avansIncasat !== undefined) updateData.avansIncasat = data.avansIncasat;
    if (data.stadiuOferta !== undefined) {
      updateData.stadiuOferta = data.stadiuOferta;
      // Auto-set dataRevenire1 to next day if status is changed to IN_ASTEPTARE and dataRevenire1 is not set
      if (data.stadiuOferta === "IN_ASTEPTARE" && !data.dataRevenire1) {
        const existingClient = await this.getClient(id);
        if (existingClient && !existingClient.dataRevenire1) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          updateData.dataRevenire1 = tomorrow;
        }
      }
    }
    if (data.dataOfertarii !== undefined) updateData.dataOfertarii = parseDate(data.dataOfertarii);
    if (data.avans !== undefined) updateData.avans = data.avans;
    if (data.stadiuComanda !== undefined) updateData.stadiuComanda = data.stadiuComanda || null;
    if (data.dataVanzarii !== undefined) updateData.dataVanzarii = parseDate(data.dataVanzarii);
    if (data.dataLivrarii !== undefined) updateData.dataLivrarii = parseDate(data.dataLivrarii);
    if (data.procentComision !== undefined) updateData.procentComision = data.procentComision !== "" ? String(data.procentComision).trim() : null;
    if (data.comisionOferta !== undefined) updateData.comisionOferta = parseDecimal(data.comisionOferta);
    if (data.incasat !== undefined) updateData.incasat = data.incasat;
    if (data.pretAchizitie !== undefined) updateData.pretAchizitie = parseDecimal(data.pretAchizitie);
    if ((data as any).achizitiePartener !== undefined)
      updateData.achizitiePartener = parseDecimal((data as any).achizitiePartener);
    if (data.ofertaFilename !== undefined) updateData.ofertaFilename = data.ofertaFilename || null;
    if (data.ofertaFilename2 !== undefined) updateData.ofertaFilename2 = data.ofertaFilename2 || null;
    if ((data as any).ofertaFilename3 !== undefined) updateData.ofertaFilename3 = (data as any).ofertaFilename3 || null;
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
    if (data.underObservation !== undefined) updateData.underObservation = data.underObservation;
    if (data.urgenta !== undefined) updateData.urgenta = data.urgenta;
    if (data.prioritate !== undefined) updateData.prioritate = data.prioritate || null;
    if (data.agentId !== undefined) updateData.agentId = data.agentId || null;

    const [client] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();

    return client || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    // Șterge mai întâi jurnalul de activitate legat de client (FK constraint)
    await db.delete(activityLogs).where(eq(activityLogs.clientId, id));
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async registerClientCall(clientId: string, userId: string): Promise<void> {
    await db
      .update(clients)
      .set({
        lastCallAt: new Date(),
        lastCallById: userId,
        callCount: sql`${clients.callCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));

    // logăm și activitatea de tip PHONE_CLICK pentru rapoarte
    await db.insert(activityLogs).values({
      userId,
      clientId,
      type: "PHONE_CLICK",
    });
  }

  async createActivityLog(data: {
    userId: string;
    clientId: string;
    type: "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK";
    meta?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(activityLogs).values({
      userId: data.userId,
      clientId: data.clientId,
      type: data.type,
      meta: (data.meta || null) as any,
    });
  }

  async createCrmMessage(senderId: string, recipientId: string, body: string): Promise<{ id: string; senderId: string; recipientId: string; body: string; readAt: Date | null; createdAt: Date }> {
    const [row] = await db.insert(crmMessages).values({
      senderId,
      recipientId,
      body,
    }).returning({
      id: crmMessages.id,
      senderId: crmMessages.senderId,
      recipientId: crmMessages.recipientId,
      body: crmMessages.body,
      readAt: crmMessages.readAt,
      createdAt: crmMessages.createdAt,
    });
    if (!row) throw new Error("Failed to create message");
    return {
      id: row.id,
      senderId: row.senderId,
      recipientId: row.recipientId,
      body: row.body,
      readAt: row.readAt ?? null,
      createdAt: row.createdAt,
    };
  }

  async getCrmMessagesBetween(userId: string, otherUserId: string, limit = 100): Promise<{ id: string; senderId: string; recipientId: string; body: string; readAt: Date | null; createdAt: Date }[]> {
    const rows = await db
      .select()
      .from(crmMessages)
      .where(
        or(
          and(eq(crmMessages.senderId, userId), eq(crmMessages.recipientId, otherUserId)),
          and(eq(crmMessages.senderId, otherUserId), eq(crmMessages.recipientId, userId))
        )
      )
      .orderBy(desc(crmMessages.createdAt))
      .limit(limit);
    return rows.reverse().map((r) => ({
      id: r.id,
      senderId: r.senderId,
      recipientId: r.recipientId,
      body: r.body,
      readAt: r.readAt ?? null,
      createdAt: r.createdAt,
    }));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmMessages)
      .where(and(eq(crmMessages.recipientId, userId), sql`${crmMessages.readAt} IS NULL`));
    return r?.count ?? 0;
  }

  async getConversationsForUser(userId: string): Promise<{ userId: string; firstName: string; lastName: string; lastMessage: string | null; lastAt: Date | null; unread: number }[]> {
    const agents = await this.getChatUsers();
    const result: { userId: string; firstName: string; lastName: string; lastMessage: string | null; lastAt: Date | null; unread: number }[] = [];
    for (const u of agents) {
      if (u.id === userId) continue;
      const last = await db
        .select({
          body: crmMessages.body,
          createdAt: crmMessages.createdAt,
          recipientId: crmMessages.recipientId,
        })
        .from(crmMessages)
        .where(
          or(
            and(eq(crmMessages.senderId, userId), eq(crmMessages.recipientId, u.id)),
            and(eq(crmMessages.senderId, u.id), eq(crmMessages.recipientId, userId))
          )
        )
        .orderBy(desc(crmMessages.createdAt))
        .limit(1);
      const unreadRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(crmMessages)
        .where(and(eq(crmMessages.senderId, u.id), eq(crmMessages.recipientId, userId), sql`${crmMessages.readAt} IS NULL`));
      const unread = unreadRows[0]?.count ?? 0;
      result.push({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        lastMessage: last[0]?.body ?? null,
        lastAt: last[0]?.createdAt ?? null,
        unread,
      });
    }
    result.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
    return result;
  }

  async getAllConversationsAdmin(): Promise<{ user1: SafeUser; user2: SafeUser; lastMessage: string | null; lastAt: Date | null }[]> {
    const agents = await this.getChatUsers();
    const pairs = new Map<string, { user1: SafeUser; user2: SafeUser; lastMessage: string | null; lastAt: Date | null }>();
    for (const u1 of agents) {
      for (const u2 of agents) {
        if (u1.id >= u2.id) continue;
        const key = [u1.id, u2.id].sort().join("_");
        if (pairs.has(key)) continue;
        const last = await db
          .select({ body: crmMessages.body, createdAt: crmMessages.createdAt })
          .from(crmMessages)
          .where(
            or(
              and(eq(crmMessages.senderId, u1.id), eq(crmMessages.recipientId, u2.id)),
              and(eq(crmMessages.senderId, u2.id), eq(crmMessages.recipientId, u1.id))
            )
          )
          .orderBy(desc(crmMessages.createdAt))
          .limit(1);
        if (last.length > 0) {
          pairs.set(key, {
            user1: u1,
            user2: u2,
            lastMessage: last[0].body,
            lastAt: last[0].createdAt,
          });
        }
      }
    }
    return Array.from(pairs.values()).sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
  }

  async markCrmMessagesAsRead(recipientId: string, senderId: string): Promise<void> {
    await db
      .update(crmMessages)
      .set({ readAt: new Date() })
      .where(and(eq(crmMessages.recipientId, recipientId), eq(crmMessages.senderId, senderId), sql`${crmMessages.readAt} IS NULL`));
  }

  async getRecentLeadsForNotifications(limit = 15, todayOnly = false): Promise<{ id: string; nume: string; sursa: string; dataAdaugare: Date | null; dataOfertarii: Date | null }[]> {
    const leadSources = ["RECLAME", "RECLAME_CAMPANII", "SITE", "FACEBOOK", "GOOGLE", "OLX", "CEL_RO", "OKAZII", "PUBLI24", "TELEFON", "TIKTOK", "BIROU", "BIROU_SHOWROOM"] as const;
    const conditions = [
      or(
        inArray(clients.sursa, leadSources),
        isNotNull(clients.dataOfertarii)
      ),
    ];
    if (todayOnly) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      conditions.push(
        or(
          and(gte(clients.dataAdaugare, startOfToday), lte(clients.dataAdaugare, endOfToday)),
          and(isNotNull(clients.dataOfertarii), gte(clients.dataOfertarii, startOfToday), lte(clients.dataOfertarii, endOfToday))
        ) as any
      );
    }
    const rows = await db
      .select({
        id: clients.id,
        nume: clients.nume,
        sursa: clients.sursa,
        dataAdaugare: clients.dataAdaugare,
        dataOfertarii: clients.dataOfertarii,
      })
      .from(clients)
      .where(and(...conditions))
      .orderBy(desc(clients.dataAdaugare))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      nume: r.nume,
      sursa: String(r.sursa ?? ""),
      dataAdaugare: r.dataAdaugare ?? null,
      dataOfertarii: r.dataOfertarii ?? null,
    }));
  }

  async getAgentActivitySummary(params: {
    agentId: string;
    from: Date;
    to: Date;
  }): Promise<{
    totalLeadsAuto: number;
    totalLeadsManual: number;
    totalPhoneClicks: number;
    totalStatusChanges: number;
    totalFollowupClicks: number;
    totalInactivitySeconds: number;
    inactivityIntervals: Array<{ start: string; end: string; duration: string }>;
  }> {
    const { agentId, from, to } = params;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Build conditions to include only clients that should appear in reports:
    // 1. Clients without 3rd follow-up completed
    // 2. Clients without future follow-up dates (all follow-up dates must be null or <= today)
    const rows = await db
      .select({
        type: activityLogs.type,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .innerJoin(clients, eq(activityLogs.clientId, clients.id))
      .where(
        and(
          eq(activityLogs.userId, agentId),
          gte(activityLogs.createdAt, from),
          lte(activityLogs.createdAt, to),
          // Exclude clients with 3rd follow-up done
          eq(clients.followUpEfectuat3, false),
          // Exclude clients with future follow-up dates - all dates must be null or <= today
          and(
            or(
              sql`${clients.dataRevenire1} IS NULL`,
              lte(clients.dataRevenire1, now)
            ),
            or(
              sql`${clients.dataRevenire2} IS NULL`,
              lte(clients.dataRevenire2, now)
            ),
            or(
              sql`${clients.dataRevenire3} IS NULL`,
              lte(clients.dataRevenire3, now)
            )
          )
        )
      )
      .orderBy(asc(activityLogs.createdAt));

    let totalLeadsAuto = 0;
    let totalLeadsManual = 0;
    let totalPhoneClicks = 0;
    let totalStatusChanges = 0;
    let totalFollowupClicks = 0;

    // Calculate inactivity intervals (>30 seconds between events)
    const INACTIVITY_THRESHOLD_MS = 30 * 1000; // 30 seconds
    let totalInactivitySeconds = 0;
    const inactivityIntervals: Array<{ start: Date; end: Date }> = [];

    // 1) Numărăm TOATE acțiunile din perioada selectată (indiferent de oră / zi)
    for (const row of rows) {
      switch (row.type) {
        case "LEAD_AUTO":
          totalLeadsAuto++;
          break;
        case "LEAD_MANUAL":
          totalLeadsManual++;
          break;
        case "PHONE_CLICK":
          totalPhoneClicks++;
          break;
        case "STATUS_CHANGE":
          totalStatusChanges++;
          break;
        case "FOLLOWUP_CLICK":
          totalFollowupClicks++;
          break;
      }
    }

    // 2) Pentru inactivitate folosim DOAR evenimentele Luni–Vineri între 08:00–17:00
    const workHoursRows = rows.filter((row) => {
      const d = row.createdAt;
      const day = d.getDay(); // 0 = Duminică, 6 = Sâmbătă
      if (day === 0 || day === 6) return false;
      const hour = d.getHours();
      return hour >= 8 && hour < 17;
    });

    for (let i = 0; i < workHoursRows.length; i++) {
      const row = workHoursRows[i];

      // Check for inactivity gap înainte de acest eveniment (în program)
      if (i > 0) {
        const prevEvent = workHoursRows[i - 1];
        const currentEvent = row;
        const gapMs = currentEvent.createdAt.getTime() - prevEvent.createdAt.getTime();

        if (gapMs > INACTIVITY_THRESHOLD_MS) {
          const gapSeconds = Math.floor(gapMs / 1000);
          totalInactivitySeconds += gapSeconds;
          inactivityIntervals.push({
            start: prevEvent.createdAt,
            end: currentEvent.createdAt,
          });
        }
      }
    }

    // Format inactivity intervals
    const formattedIntervals = inactivityIntervals.map((interval) => {
      const startTime = interval.start.toLocaleTimeString("ro-RO", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      });
      const endTime = interval.end.toLocaleTimeString("ro-RO", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      });
      
      const durationMs = interval.end.getTime() - interval.start.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      let durationStr = "";
      if (hours > 0) {
        durationStr = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        durationStr = `${minutes}m ${seconds}s`;
      } else {
        durationStr = `${seconds}s`;
      }

      return {
        start: startTime,
        end: endTime,
        duration: durationStr,
      };
    });

    return {
      totalLeadsAuto,
      totalLeadsManual,
      totalPhoneClicks,
      totalStatusChanges,
      totalFollowupClicks,
      totalInactivitySeconds,
      inactivityIntervals: formattedIntervals,
    };
  }

  async getAgentActivityDetails(params: {
    agentId: string;
    from: Date;
    to: Date;
    ownerAgentId?: string;
  }): Promise<Array<{
    id: string;
    clientId: string;
    clientName: string;
    clientPhone: string | null;
    clientNotes: string | null;
    type: "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK";
    createdAt: Date;
    meta: Record<string, unknown> | null;
  }>> {
    const { agentId, from, to, ownerAgentId } = params;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const baseConditions = [
      eq(activityLogs.userId, agentId),
      gte(activityLogs.createdAt, from),
      lte(activityLogs.createdAt, to),
      // Exclude clients cu follow-up 3 efectuat
      eq(clients.followUpEfectuat3, false),
      // Exclude clienți cu follow-up în viitor
      and(
        or(sql`${clients.dataRevenire1} IS NULL`, lte(clients.dataRevenire1, now)),
        or(sql`${clients.dataRevenire2} IS NULL`, lte(clients.dataRevenire2, now)),
        or(sql`${clients.dataRevenire3} IS NULL`, lte(clients.dataRevenire3, now)),
      ),
    ];

    if (ownerAgentId) {
      baseConditions.push(eq(clients.agentId, ownerAgentId));
    }

    const rows = await db
      .select({
        id: activityLogs.id,
        clientId: clients.id,
        clientName: clients.nume,
        clientPhone: clients.telefon,
        clientNotes: clients.observatiiClient,
        type: activityLogs.type,
        createdAt: activityLogs.createdAt,
        meta: activityLogs.meta,
      })
      .from(activityLogs)
      .innerJoin(clients, eq(activityLogs.clientId, clients.id))
      .where(and(...baseConditions))
      .orderBy(asc(activityLogs.createdAt));

    // Cast meta la obiect simplu pentru frontend (fără filtru de oră/zi - vrem toate acțiunile)
    return rows.map((row) => ({
      ...row,
      meta: (row.meta as any) || null,
      clientNotes: (row.clientNotes as any) || null,
    }));
  }

  async getClientStats(agentId?: string, dateFrom?: string, dateTo?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    wonValue: number;
    pipelineValue: number;
  }> {
    const conditions = [];

    if (agentId) {
      // When filtering by agentId, ensure we only get clients assigned to that agent
      // and exclude clients with null agentId
      conditions.push(eq(clients.agentId, agentId));
      conditions.push(isNotNull(clients.agentId));
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      conditions.push(gte(clients.dataVanzarii, fromDate));
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(clients.dataVanzarii, toDate));
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

  async getDashboardTodayStats(
    agentId: string | undefined,
    dayStart: Date,
    dayEnd: Date
  ): Promise<{
    clientiNoi: number;
    oferteTrimise: number;
    valoareOferte: number;
    followUpEfectuat: number;
    vanzariNr: number;
    vanzariValoare: number;
    refuzuriNr: number;
    refuzuriValoare: number;
  }> {
    const conditions = [];
    if (agentId) {
      conditions.push(eq(clients.agentId, agentId));
      conditions.push(isNotNull(clients.agentId));
    }
    let list = await (conditions.length
      ? db.select().from(clients).where(and(...conditions))
      : db.select().from(clients));

    const start = dayStart.getTime();
    const end = dayEnd.getTime();
    const inDay = (d: Date | null) => d && d.getTime() >= start && d.getTime() <= end;

    let clientiNoi = 0;
    let oferteTrimise = 0;
    let valoareOferte = 0;
    let vanzariNr = 0;
    let vanzariValoare = 0;
    let refuzuriNr = 0;
    let refuzuriValoare = 0;

    for (const c of list) {
      const dataAdaugare = c.dataAdaugare ? new Date(c.dataAdaugare) : null;
      const dataOfertarii = c.dataOfertarii ? new Date(c.dataOfertarii) : null;
      const dataVanzarii = c.dataVanzarii ? new Date(c.dataVanzarii) : null;
      const updatedAt = c.updatedAt ? new Date(c.updatedAt) : null;

      if (inDay(dataAdaugare)) clientiNoi++;
      if (inDay(dataOfertarii)) {
        oferteTrimise++;
        if (c.valoareOferta) valoareOferte += parseFloat(c.valoareOferta);
      }
      // Pentru vânzări numărăm în principal după data vânzării;
      // dacă nu este setată, cădem pe updatedAt (când a fost marcat ca VÂNDUT).
      const saleDate = dataVanzarii || updatedAt;
      if (c.stadiuOferta === "VANDUT" && inDay(saleDate)) {
        vanzariNr++;
        if (c.valoareOferta) vanzariValoare += parseFloat(c.valoareOferta);
      }
      if (c.stadiuOferta === "REFUZAT" && inDay(updatedAt)) {
        refuzuriNr++;
        if (c.valoareOferta) refuzuriValoare += parseFloat(c.valoareOferta);
      }
    }

    return {
      clientiNoi,
      oferteTrimise,
      valoareOferte,
      followUpEfectuat: 0,
      vanzariNr,
      vanzariValoare,
      refuzuriNr,
      refuzuriValoare,
    };
  }

  async bulkImportClients(
    rows: Partial<Record<string, string>>[],
    agentId?: string,
    duplicateStrategy: "skip" | "update" | "create" = "skip"
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
          // Format european D/M/YYYY (ziua/luna/anul)
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
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
        const parsedValue = parseValue(row.valoareOferta);

        // Check for duplicates: same phone + same value = skip, same phone + different value = add (returning client)
        if (normalizedPhone && normalizedPhone !== "#ERROR!" && normalizedPhone !== "N/A") {
          const existingClients = await db.select().from(clients)
            .where(eq(clients.telefon, normalizedPhone));

          if (existingClients.length > 0) {
            // Check if any existing client has the exact same value
            const exactDuplicate = existingClients.find(c => {
              const existingValue = c.valoareOferta ? parseFloat(c.valoareOferta) : 0;
              const newValue = parsedValue ? parseFloat(parsedValue) : 0;
              return Math.abs(existingValue - newValue) < 0.01;
            });

            if (exactDuplicate) {
              // Same phone + same value = pure duplicate, skip
              skipped++;
              continue;
            }
            // Same phone + different value = returning client, continue to add
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
          valoareOferta: parsedValue,
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

  async getNextCriteriumNumber(agentId: string): Promise<number> {
    // Get the maximum criteriu number for this agent
    const result = await db
      .select({ maxCriteriu: sql<number>`MAX(${clients.numCriteriu})` })
      .from(clients)
      .where(eq(clients.agentId, agentId));

    const maxCriteriu = result[0]?.maxCriteriu;

    // If no criteriu numbers exist yet, start from 7984
    if (maxCriteriu === null || maxCriteriu === undefined) {
      return 7984;
    }

    // Otherwise, return the next number
    return maxCriteriu + 1;
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
    // Toți userii activi cu rol AGENT sau ADMIN (pentru raport profitabilitate și cheltuieli)
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

  async getChatUsers(): Promise<SafeUser[]> {
    const list = await db.select().from(users).where(
      and(
        eq(users.active, true),
        or(eq(users.role, "AGENT"), eq(users.role, "ADMIN"))
      )
    );
    return list.map(u => {
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
      categoria: (data.categoria as any) || "AGENTI",
      agentId: data.agentId ?? null,
      luna: data.luna,
      an: data.an,
      targetVanzari: data.targetVanzari,
      targetClienti: data.targetClienti ?? 0,
      targetOferteTransmise: data.targetOferteTransmise ?? 0,
      targetFollowUp: data.targetFollowUp ?? 0,
      targetConversie: data.targetConversie ?? null,
      targetClientiNoi: data.targetClientiNoi ?? 0,
      targetColaboratoriNoi: data.targetColaboratoriNoi ?? 0,
      targetPartenerActiv: data.targetPartenerActiv ?? 0,
    }).returning();
    return target;
  }

  async updateTarget(id: string, data: UpdateTarget): Promise<Target | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.agentId !== undefined) updateData.agentId = data.agentId ?? null;
    if (data.luna !== undefined) updateData.luna = data.luna;
    if (data.an !== undefined) updateData.an = data.an;
    if (data.targetVanzari !== undefined) updateData.targetVanzari = data.targetVanzari;
    if (data.targetClienti !== undefined) updateData.targetClienti = data.targetClienti;
    if (data.targetOferteTransmise !== undefined) updateData.targetOferteTransmise = data.targetOferteTransmise;
    if (data.targetFollowUp !== undefined) updateData.targetFollowUp = data.targetFollowUp;
    if (data.targetConversie !== undefined) updateData.targetConversie = data.targetConversie ?? null;
    if (data.targetClientiNoi !== undefined) updateData.targetClientiNoi = data.targetClientiNoi;
    if (data.targetColaboratoriNoi !== undefined) updateData.targetColaboratoriNoi = data.targetColaboratoriNoi;
    if (data.targetPartenerActiv !== undefined) updateData.targetPartenerActiv = data.targetPartenerActiv;
    const [target] = await db.update(targets).set(updateData).where(eq(targets.id, id)).returning();
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

    const agentConditions = agentId ? [eq(clients.agentId, agentId), isNotNull(clients.agentId)] : [];
    const wonClients = await db.select().from(clients).where(
      and(
        ...agentConditions,
        eq(clients.stadiuOferta, "VANDUT"),
        or(
          and(gte(clients.dataVanzarii, startDate), lte(clients.dataVanzarii, endDate)),
          and(sql`${clients.dataVanzarii} IS NULL`, gte(clients.updatedAt, startDate), lte(clients.updatedAt, endDate))
        )
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

  async getTargetDetailedProgress(targetId: string): Promise<{
    target: Target | null;
    progress: {
      realizedValue: number;
      realizedVanzariNr: number;
      realizedClientiContactati: number;
      realizedOferteTransmise: number;
      realizedFollowUp: number;
      realizedConversie: number | null;
      realizedClientiNoi: number;
      realizedColaboratoriNoi: number;
      realizedPartenerActiv: number;
    };
  }> {
    const zeroProgress = {
      realizedValue: 0,
      realizedVanzariNr: 0,
      realizedClientiContactati: 0,
      realizedOferteTransmise: 0,
      realizedFollowUp: 0,
      realizedConversie: null as number | null,
      realizedClientiNoi: 0,
      realizedColaboratoriNoi: 0,
      realizedPartenerActiv: 0,
    };

    const [target] = await db.select().from(targets).where(eq(targets.id, targetId));
    if (!target) {
      return { target: null, progress: zeroProgress };
    }

    const agentId = target.agentId;
    const luna = target.luna;
    const an = target.an;
    const startDate = new Date(an, luna - 1, 1);
    const endDate = new Date(an, luna, 0, 23, 59, 59);

    const agentFilter = agentId ? [eq(clients.agentId, agentId), isNotNull(clients.agentId)] : [];
    const soldDateInRange = or(
      and(gte(clients.dataVanzarii, startDate), lte(clients.dataVanzarii, endDate)),
      and(sql`${clients.dataVanzarii} IS NULL`, gte(clients.updatedAt, startDate), lte(clients.updatedAt, endDate))
    );

    const wonClients = await db.select().from(clients).where(
      and(...agentFilter, eq(clients.stadiuOferta, "VANDUT"), soldDateInRange)
    );
    let realizedValue = 0;
    const partnerIdsSold = new Set<string>();
    for (const c of wonClients) {
      if (c.valoareOferta) realizedValue += parseFloat(c.valoareOferta);
      if (c.isPartnerOrder && c.partnerId) partnerIdsSold.add(c.partnerId);
    }
    const realizedVanzariNr = wonClients.length;
    const realizedPartenerActiv = partnerIdsSold.size;

    const clientsContactati = await db.select({ id: clients.id }).from(clients).where(
      and(...agentFilter, eq(clients.contactat, true), gte(clients.updatedAt, startDate), lte(clients.updatedAt, endDate))
    );
    const realizedClientiContactati = clientsContactati.length;

    const oferteInRange = await db.select({ id: clients.id }).from(clients).where(
      and(...agentFilter, gte(clients.dataOfertarii, startDate), lte(clients.dataOfertarii, endDate))
    );
    const realizedOferteTransmise = oferteInRange.length;

    const clientiNoiInRange = await db.select({ id: clients.id, sursa: clients.sursa }).from(clients).where(
      and(...agentFilter, gte(clients.dataAdaugare, startDate), lte(clients.dataAdaugare, endDate))
    );
    let realizedClientiNoi = clientiNoiInRange.length;
    const realizedColaboratoriNoi = clientiNoiInRange.filter(
      (c) => c.sursa === "MONTATORI" || c.sursa === "MONTATORI_COLABORATORI"
    ).length;

    let realizedFollowUp = 0;
    if (agentId) {
      const followUpLogs = await db.select().from(activityLogs).where(
        and(
          eq(activityLogs.userId, agentId),
          eq(activityLogs.type, "FOLLOWUP_CLICK"),
          gte(activityLogs.createdAt, startDate),
          lte(activityLogs.createdAt, endDate)
        )
      );
      realizedFollowUp = followUpLogs.length;
    }

    const realizedConversie =
      realizedOferteTransmise > 0 ? Math.round((realizedVanzariNr / realizedOferteTransmise) * 1000) / 10 : null;

    return {
      target,
      progress: {
        realizedValue,
        realizedVanzariNr,
        realizedClientiContactati,
        realizedOferteTransmise,
        realizedFollowUp,
        realizedConversie,
        realizedClientiNoi,
        realizedColaboratoriNoi,
        realizedPartenerActiv,
      },
    };
  }

  // ============ TASK / PROIECTE METHODS ============

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getAllTasks(filters?: { assignedAgentId?: string; createdById?: string }): Promise<Task[]> {
    const conditions = [];
    if (filters?.assignedAgentId) conditions.push(eq(tasks.assignedAgentId, filters.assignedAgentId));
    if (filters?.createdById) conditions.push(eq(tasks.createdById, filters.createdById));
    if (conditions.length) {
      return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async createTask(data: CreateTask): Promise<Task> {
    const [task] = await db.insert(tasks).values({
      numeProiect: data.numeProiect,
      dataLimita: data.dataLimita ? new Date(data.dataLimita) : null,
      createdById: data.createdById,
      assignedAgentId: data.assignedAgentId || null,
      observatii: data.observatii || null,
    }).returning();
    return task;
  }

  async updateTask(id: string, data: UpdateTask): Promise<Task | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.numeProiect !== undefined) updateData.numeProiect = data.numeProiect;
    if (data.dataLimita !== undefined) updateData.dataLimita = data.dataLimita ? new Date(data.dataLimita) : null;
    if (data.createdById !== undefined) updateData.createdById = data.createdById;
    if (data.assignedAgentId !== undefined) updateData.assignedAgentId = data.assignedAgentId || null;
    if (data.observatii !== undefined) updateData.observatii = data.observatii || null;
    if (data.completed !== undefined) updateData.completed = data.completed;
    const [task] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // ============ DOCUMENTAȚIE ============

  async createDocument(data: CreateDocument): Promise<Document> {
    const [doc] = await db.insert(documente).values({
      categorie: data.categorie as any,
      nume: data.nume,
      objectPath: data.objectPath,
      fileName: data.fileName || null,
      uploadedById: data.uploadedById || null,
    }).returning();
    if (!doc) throw new Error("Failed to create document");
    return doc;
  }

  async getDocumente(filters?: { categorie?: string }): Promise<(Document & { uploadedByFirstName?: string; uploadedByLastName?: string })[]> {
    const base = db
      .select({
        id: documente.id,
        categorie: documente.categorie,
        nume: documente.nume,
        objectPath: documente.objectPath,
        fileName: documente.fileName,
        uploadedById: documente.uploadedById,
        uploadedAt: documente.uploadedAt,
        uploadedByFirstName: users.firstName,
        uploadedByLastName: users.lastName,
      })
      .from(documente)
      .leftJoin(users, eq(documente.uploadedById, users.id));
    const withWhere = filters?.categorie
      ? base.where(eq(documente.categorie, filters.categorie as any))
      : base;
    const rows = await withWhere.orderBy(desc(documente.uploadedAt));
    return rows.map((r) => ({
      id: r.id,
      categorie: r.categorie,
      nume: r.nume,
      objectPath: r.objectPath,
      fileName: r.fileName,
      uploadedById: r.uploadedById,
      uploadedAt: r.uploadedAt,
      uploadedByFirstName: r.uploadedByFirstName ?? undefined,
      uploadedByLastName: r.uploadedByLastName ?? undefined,
    }));
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documente).where(eq(documente.id, id)).returning();
    return result.length > 0;
  }

  // ============ PARTNER METHODS ============

  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  /** Resolve partner_id for client: by id (UUID), by nume, or create new partner with that nume. */
  async getOrCreatePartnerId(idOrNume: string): Promise<string | null> {
    const trimmed = (idOrNume || "").trim();
    if (!trimmed) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      const partner = await this.getPartner(trimmed);
      if (partner) return partner.id;
    }
    const byNume = await db.select().from(partners).where(ilike(partners.nume, trimmed)).limit(1);
    if (byNume.length > 0) return byNume[0].id;
    const created = await this.createPartner({ nume: trimmed });
    return created.id;
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
      tipPartener: data.tipPartener || "DISTRIBUITOR",
      cui: data.cui || null,
      telefon: data.telefon || null,
      email: data.email || null,
      adresa: data.adresa || null,
      judet: data.judet || null,
      persoanaContact: data.persoanaContact || null,
      note: data.note || null,
      platitorTva: data.platitorTva ?? false,
      statusPerformanta: data.statusPerformanta ?? null,
      calificare: data.calificare ?? null,
      clasificare: data.clasificare ?? null,
      statusContact: data.statusContact ?? null,
      file1: data.file1 || null,
      file2: data.file2 || null,
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
    if (data.judet !== undefined) updateData.judet = data.judet || null;
    if (data.persoanaContact !== undefined) updateData.persoanaContact = data.persoanaContact || null;
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.platitorTva !== undefined) updateData.platitorTva = data.platitorTva;
    if (data.statusPerformanta !== undefined) updateData.statusPerformanta = data.statusPerformanta ?? null;
    if (data.calificare !== undefined) updateData.calificare = data.calificare ?? null;
    if (data.clasificare !== undefined) updateData.clasificare = data.clasificare ?? null;
    if (data.statusContact !== undefined) updateData.statusContact = data.statusContact ?? null;
    if (data.file1 !== undefined) updateData.file1 = data.file1 || null;
    if (data.file2 !== undefined) updateData.file2 = data.file2 || null;
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
    // Asigurăm existența sediilor de bază (central + hală + showroom-uri)
    const defaultSedii = [
      { nume: "Sediu central București", oras: "București", judet: "București" },
      { nume: "Hală producție", oras: "București", judet: "Ilfov" },
      { nume: "Showroom Bragadiru", oras: "Bragadiru", judet: "Ilfov" },
      { nume: "Showroom Constanța", oras: "Constanța", judet: "Constanța" },
      { nume: "Showroom Teleorman", oras: "Alexandria", judet: "Teleorman" },
      { nume: "Showroom Giurgiu", oras: "Giurgiu", judet: "Giurgiu" },
    ];

    let allSedii = await db.select().from(sedii);
    const existingNames = new Set(allSedii.map((s) => s.nume));

    const missing = defaultSedii.filter((d) => !existingNames.has(d.nume));
    if (missing.length > 0) {
      for (const s of missing) {
        await db
          .insert(sedii)
          .values({
            nume: s.nume,
            oras: s.oras,
            judet: s.judet,
            activ: true,
          } as any)
          .onConflictDoNothing();
      }
      allSedii = await db.select().from(sedii);
    }

    let filtered = allSedii;
    if (activ !== undefined) {
      filtered = filtered.filter((s) => s.activ === activ);
    }

    return filtered.sort((a, b) => a.nume.localeCompare(b.nume));
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
    let rows = await db
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.level, level as any),
          eq(expenseCategories.active, true),
        ),
      )
      .orderBy(expenseCategories.displayOrder);

    // Asigurăm existența tuturor categoriilor principale standard (inclusiv „Cota parte”, „Transport marfă”)
    if (level === "main") {
      const defaultMain = [
        { id: "cat-salarii", name: "Salarii + bonusuri", displayOrder: 1 },
        { id: "cat-auto", name: "Cheltuieli auto", displayOrder: 2 },
        { id: "cat-generale", name: "Cheltuieli generale", displayOrder: 3 },
        { id: "cat-bugete", name: "Bugete de stat", displayOrder: 4 },
        { id: "cat-cota-parte", name: "Cota parte", displayOrder: 5 },
        { id: "cat-transport-marfa", name: "Transport marfă", displayOrder: 6 },
        { id: "cat-vara", name: "Cheltuiala Vara", displayOrder: 7 },
        { id: "cat-iarna", name: "Cheltuiala Iarna", displayOrder: 8 },
        { id: "cat-nedeductibile", name: "Cheltuieli nedeductibile", displayOrder: 9 },
      ];

      const existingIds = new Set(rows.map((r) => r.id));
      for (const def of defaultMain) {
        if (!existingIds.has(def.id)) {
          const [inserted] = await db
            .insert(expenseCategories)
            .values({
              id: def.id,
              name: def.name,
              level: "main",
              active: true,
              displayOrder: def.displayOrder,
            } as any)
            .onConflictDoNothing()
            .returning();
          if (inserted) {
            rows.push(inserted);
          }
        }
      }

      rows.sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      );
    }

    return rows;
  }

  async getExpenseCategoriesByParent(parentId: string): Promise<ExpenseCategory[]> {
    // În mod normal, categoriile sunt seed-uite prin scripts/seed-expenses-data.ts.
    // Ca să nu depindem de rularea scriptului pe fiecare mediu, dacă nu găsim nimic
    // pentru anumite categorii principale, inserăm aici valorile implicite.
    const load = async () =>
      await db
        .select()
        .from(expenseCategories)
        .where(
          and(
            eq(expenseCategories.parentId, parentId),
            eq(expenseCategories.active, true),
          )
        )
        .orderBy(expenseCategories.displayOrder);

    let rows = await load();
    if (rows.length > 0) {
      // Ajustări speciale pentru Cheltuieli generale:
      if (parentId === "cat-generale") {
        // 1) Scoatem subcategoriile vechi nedorite și cele mutate la „Cota parte”
        const bannedExactNames = new Set([
          "Cota parte showroom",
          "Cota parte generale",
          "Angajați neproductivi",
          "Marketing",
          "Contabil/Jurist",
          "Protecția/Medicina muncii",
          "Abonamente",
          "Materie primă și ambalaj",
        ]);
        rows = rows.filter((r) => {
          if (bannedExactNames.has(r.name)) return false;
          const n = (r.name || "").toLowerCase();
          // În caz că în DB există variante puțin diferite
          if (n.includes("marketing")) return false;
          if (n.includes("contabil") || n.includes("jurist")) return false;
          if (n.includes("protectia") || n.includes("protecția") || n.includes("medicina muncii")) return false;
          if (n.includes("abonament")) return false;
          if (n.includes("materie prim") && n.includes("ambalaj")) return false;
          return true;
        });

        // 2) Ne asigurăm că există subcategoriile cerute (fără Marketing/Abonamente,
        // iar „Materie primă și ambalaj” este împărțită în două)
        const requiredNames = [
          "Consumabile",
          "Materie primă",
          "Ambalaj",
          "Utilități",
          "Chirie",
          "Dezvoltare/Inovatie",
          "Dezvoltare/Extindere",
          "Prestări servicii",
        ];

        const existingNames = new Set(rows.map((r) => r.name));
        let displayOrderStart = rows.length > 0 ? Math.max(...rows.map((r) => r.displayOrder ?? 0)) + 1 : 1;

        for (const name of requiredNames) {
          if (!existingNames.has(name)) {
            const [inserted] = await db
              .insert(expenseCategories)
              .values({
                parentId,
                name,
                level: "sub",
                displayOrder: displayOrderStart++,
                active: true,
              } as any)
              .returning();
            rows.push(inserted);
          }
        }

        // Reordonăm după displayOrder pentru UI consistent
        rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      } else if (parentId === "cat-cota-parte") {
        // Asigurăm toate subcategoriile pentru „Cota parte” (inclusiv Salariu brut, Comision, Bonuri de masa)
        const required = [
          { id: "sub-cota-marketing", name: "Marketing" },
          { id: "sub-cota-contabil-jurist", name: "Contabil/Jurist" },
          { id: "sub-cota-protectia-medicina-muncii", name: "Protecția/Medicina muncii" },
          { id: "sub-cota-abonamente", name: "Abonamente" },
          { id: "sub-cota-salariu", name: "Salariu brut" },
          { id: "sub-cota-comision", name: "Comision" },
          { id: "sub-cota-bonuri-masa", name: "Bonuri de masa" },
        ];

        const existingById = new Set(rows.map((r) => r.id));
        const existingByName = new Set(rows.map((r) => r.name));
        let displayOrderStart =
          rows.length > 0 ? Math.max(...rows.map((r) => r.displayOrder ?? 0)) + 1 : 1;

        for (const def of required) {
          if (!existingById.has(def.id) && !existingByName.has(def.name)) {
            const [inserted] = await db
              .insert(expenseCategories)
              .values({
                id: def.id,
                parentId,
                name: def.name,
                level: "sub",
                displayOrder: displayOrderStart++,
                active: true,
              } as any)
              .onConflictDoNothing()
              .returning();
            if (inserted) {
              rows.push(inserted);
            }
          }
        }

        rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      } else if (parentId === "cat-transport-marfa") {
        // Asigurăm subcategoriile pentru „Transport marfă”
        const required = [
          { id: "sub-transport-flota-auto", name: "Flota auto" },
          { id: "sub-transport-curier", name: "Curier" },
        ];

        const existingById = new Set(rows.map((r) => r.id));
        const existingByName = new Set(rows.map((r) => r.name));
        let displayOrderStart =
          rows.length > 0 ? Math.max(...rows.map((r) => r.displayOrder ?? 0)) + 1 : 1;

        for (const def of required) {
          if (!existingById.has(def.id) && !existingByName.has(def.name)) {
            const [inserted] = await db
              .insert(expenseCategories)
              .values({
                id: def.id,
                parentId,
                name: def.name,
                level: "sub",
                displayOrder: displayOrderStart++,
                active: true,
              } as any)
              .onConflictDoNothing()
              .returning();
            if (inserted) {
              rows.push(inserted);
            }
          }
        }

        rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      }

      return rows;
    }

    // Categorii fără subcategorii (doar tip principal)
    if (parentId === "cat-vara" || parentId === "cat-iarna") {
      return [];
    }

    // Auto-seed subcategorii implicite dacă lipsesc complet
    const subs: { id: string; name: string; displayOrder: number }[] = [];
    if (parentId === "cat-bugete") {
      subs.push(
        { id: "sub-tva", parentId: "cat-bugete", name: "TVA", displayOrder: 1 },
        { id: "sub-impozit", parentId: "cat-bugete", name: "Impozit", displayOrder: 2 },
        { id: "sub-penalitati", parentId: "cat-bugete", name: "Penalități", displayOrder: 3 },
        { id: "sub-esalonari", parentId: "cat-bugete", name: "Eșalonări", displayOrder: 4 },
      );
    } else if (parentId === "cat-auto") {
      subs.push(
        { id: "sub-combustibil", parentId: "cat-auto", name: "Combustibil", displayOrder: 1 },
        { id: "sub-service", parentId: "cat-auto", name: "Revizii/Service", displayOrder: 2 },
        { id: "sub-altele-auto", parentId: "cat-auto", name: "Altele", displayOrder: 3 },
        { id: "sub-asigurari", parentId: "cat-auto", name: "Asigurări", displayOrder: 4 },
        { id: "sub-leasing", parentId: "cat-auto", name: "Leasing", displayOrder: 5 },
        { id: "sub-rovinieta", parentId: "cat-auto", name: "Rovinieta", displayOrder: 6 },
      );
    } else if (parentId === "cat-generale") {
      subs.push(
        { id: "sub-chirie", parentId: "cat-generale", name: "Chirie", displayOrder: 1 },
        { id: "sub-utilitati", parentId: "cat-generale", name: "Utilități", displayOrder: 2 },
        { id: "sub-consumabile", parentId: "cat-generale", name: "Consumabile", displayOrder: 3 },
        { id: "sub-materie-prima", parentId: "cat-generale", name: "Materie primă", displayOrder: 4 },
        { id: "sub-ambalaj", parentId: "cat-generale", name: "Ambalaj", displayOrder: 5 },
        { id: "sub-securitate", parentId: "cat-generale", name: "Securitate", displayOrder: 6 },
        { id: "sub-salubritate", parentId: "cat-generale", name: "Salubritate", displayOrder: 7 },
        { id: "sub-altele-generale", parentId: "cat-generale", name: "Altele", displayOrder: 8 },
        { id: "sub-prestari-servicii", parentId: "cat-generale", name: "Prestări servicii", displayOrder: 9 },
      );
    } else if (parentId === "cat-cota-parte") {
      subs.push(
        { id: "sub-cota-marketing", parentId: "cat-cota-parte", name: "Marketing", displayOrder: 1 },
        { id: "sub-cota-contabil-jurist", parentId: "cat-cota-parte", name: "Contabil/Jurist", displayOrder: 2 },
        { id: "sub-cota-protectia-medicina-muncii", parentId: "cat-cota-parte", name: "Protecția/Medicina muncii", displayOrder: 3 },
        { id: "sub-cota-abonamente", parentId: "cat-cota-parte", name: "Abonamente", displayOrder: 4 },
        { id: "sub-cota-salariu", parentId: "cat-cota-parte", name: "Salariu brut", displayOrder: 5 },
        { id: "sub-cota-comision", parentId: "cat-cota-parte", name: "Comision", displayOrder: 6 },
        { id: "sub-cota-bonuri-masa", parentId: "cat-cota-parte", name: "Bonuri de masa", displayOrder: 7 },
      );
    } else if (parentId === "cat-salarii") {
      subs.push(
        { id: "sub-salariu-brut", parentId: "cat-salarii", name: "Salariu brut", displayOrder: 1 },
        { id: "sub-comision", parentId: "cat-salarii", name: "Comision", displayOrder: 2 },
        { id: "sub-bonuri", parentId: "cat-salarii", name: "Bonuri de masa", displayOrder: 3 },
        { id: "sub-prestari-servicii", parentId: "cat-salarii", name: "Prestări servicii", displayOrder: 4 },
      );
    } else if (parentId === "cat-transport-marfa") {
      subs.push(
        { id: "sub-transport-flota-auto", parentId: "cat-transport-marfa", name: "Flota auto", displayOrder: 1 },
        { id: "sub-transport-curier", parentId: "cat-transport-marfa", name: "Curier", displayOrder: 2 },
      );
    }

    if (subs.length > 0) {
      for (const sub of subs) {
        await db
          .insert(expenseCategories)
          .values({
            id: sub.id,
            parentId,
            name: sub.name,
            level: "sub",
            displayOrder: sub.displayOrder,
            active: true,
          } as any)
          .onConflictDoNothing();
      }
      rows = await load();
    }

    return rows;
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
      subcategoryId: (data.subcategoryId && data.subcategoryId.trim()) ? data.subcategoryId : null,
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
      documentUrl: data.documentUrl || null,
      tipCheltuiala: data.tipCheltuiala || null,
    }).returning();
    return cheltuiala;
  }

  async updateCheltuialaAgent(id: string, data: UpdateCheltuialaAgent): Promise<CheltuialaAgent | undefined> {
    const updateData: any = {};

    if (data.agentId !== undefined) updateData.agentId = data.agentId || null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.subcategoryId !== undefined) updateData.subcategoryId = (data.subcategoryId && data.subcategoryId.trim()) ? data.subcategoryId : null;
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
    if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl || null;
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
      documentUrl: (data as any).documentUrl || null,
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
    if ((data as any).documentUrl !== undefined) updateData.documentUrl = (data as any).documentUrl || null;
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
    // Get all VANDUT clients for this agent in the specified month/year.
    // Include:
    //  - vânzări directe (fără partnerId)
    //  - vânzări prin parteneri (distribuitori / colaboratori)
    // Exclude:
    //  - vânzările prin parteneri comisionari (partners.tipPartener = PARTENER_COMISIONAR)
    // Calculăm intervalul exact al lunii (folosind date locale) ca să nu existe decalaje de o zi
    const soldClients = await db
      .select({
        valoareOferta: clients.valoareOferta,
        pretAchizitie: clients.pretAchizitie,
        categorieProdus: clients.categorieProdus,
        comisionOferta: clients.comisionOferta,
      })
      .from(clients)
      .leftJoin(partners, eq(clients.partnerId, partners.id))
      .where(
        and(
          eq(clients.agentId, agentId),
          eq(clients.stadiuOferta, "VANDUT"),
          eq(clients.incasat, true),
          // Interval lună: folosim COALESCE(dataVanzarii, updatedAt),
          // exact cum se face și în alte statistici (ca să prindem vânzările fără dată setată)
          sql`EXTRACT(MONTH FROM COALESCE(${clients.dataVanzarii}, ${clients.updatedAt})) = ${luna}`,
          sql`EXTRACT(YEAR FROM COALESCE(${clients.dataVanzarii}, ${clients.updatedAt})) = ${an}`,
          // Excludem doar partenerii comisionari
          or(
            isNull(clients.partnerId),
            ne(partners.tipPartener, "PARTENER_COMISIONAR")
          )
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
    // NOTE:
    // - includem toți clienții VANDUȚI și ÎNCASAȚI (filtrul este deja în query),
    //   indiferent dacă au sau nu Achiziție furnizor setată (pretAchizitie poate fi 0/null).
    // - clienții fără comision (comisionOferta = null/0) sunt incluși în venit și achiziție,
    //   dar excluși din calculul procentului de comision mediu.
    for (const client of soldClients) {
      const valoare = parseFloat(client.valoareOferta || "0");
      const achizitie = parseFloat(client.pretAchizitie || "0");

      // Only use comisionOferta - clients without it are excluded from commission totals
      // They are still included in revenue (valoare) and achizitie calculations
      const hasComision = client.comisionOferta && parseFloat(client.comisionOferta) > 0;
      const comision = hasComision ? parseFloat(client.comisionOferta!) : 0;

      // Track totals for weighted average commission (only from clients WITH commission)
      if (hasComision) {
        totalValoareOferta += valoare;
        totalComisionOferta += comision;
      }

      if (client.categorieProdus === "GARD") {
        venitGard += valoare;
        achizitieGard += achizitie;
        if (hasComision) comisionGard += comision;
        nrVanzariGard++;
      } else {
        // All other categories go to Acoperis (ACOPERIS, RULOURI_EXTERIOARE, FATADA, SISTEM_PLUVIAL, etc.)
        venitAcoperis += valoare;
        achizitieAcoperis += achizitie;
        if (hasComision) comisionAcoperis += comision;
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

  async getShowroomProfitabilityCosts(luna: number, an: number): Promise<Record<string, {
    sediuName: string;
    chirie: number;
    utilitati: number;
    marketing: number;
    consumabile: number;
    alteCheltuieli: number;
    total: number;
    cheltuieliAgenti: number;
    salarii: number;
    combustibil: number;
    auto: number;
  }>> {
    // Get all showrooms
    const allSedii = await db.select().from(sedii);

    // Get all showroom expenses for this month/year
    const sediuExpenses = await db.select().from(cheltuieliSediu).where(
      and(
        eq(cheltuieliSediu.luna, luna),
        eq(cheltuieliSediu.an, an)
      )
    );

    // Get all agent expenses for this month/year with agent info
    const agentExpenses = await db.select({
      id: cheltuieliAgent.id,
      suma: cheltuieliAgent.suma,
      sediuId: cheltuieliAgent.sediuId,
      subcategoryId: cheltuieliAgent.subcategoryId,
      agentId: cheltuieliAgent.agentId,
    }).from(cheltuieliAgent).where(
      and(
        eq(cheltuieliAgent.luna, luna),
        eq(cheltuieliAgent.an, an)
      )
    );

    // Get all subcategories for mapping
    const allSubcategories = await db.select().from(expenseCategories).where(
      eq(expenseCategories.level, "sub")
    );
    const subcategoryNames: Record<string, string> = {};
    for (const cat of allSubcategories) {
      subcategoryNames[cat.id] = cat.name.toLowerCase();
    }

    // Initialize result with all showrooms
    const result: Record<string, {
      sediuName: string;
      chirie: number;
      utilitati: number;
      marketing: number;
      consumabile: number;
      alteCheltuieli: number;
      total: number;
      cheltuieliAgenti: number;
      salarii: number;
      combustibil: number;
      auto: number;
    }> = {};

    for (const sediu of allSedii) {
      result[sediu.id] = {
        sediuName: sediu.nume,
        chirie: 0,
        utilitati: 0,
        marketing: 0,
        consumabile: 0,
        alteCheltuieli: 0,
        total: 0,
        cheltuieliAgenti: 0,
        salarii: 0,
        combustibil: 0,
        auto: 0,
      };
    }

    // Aggregate showroom expenses by showroom and category
    for (const expense of sediuExpenses) {
      const sediuId = expense.sediuId;
      if (!result[sediuId]) continue;

      const suma = parseFloat(expense.suma?.toString() || "0");
      const subcategoryName = expense.subcategoryId ? (subcategoryNames[expense.subcategoryId] || "") : "";

      if (subcategoryName.includes("chir") || subcategoryName.includes("cota parte showroom")) {
        result[sediuId].chirie += suma;
      } else if (subcategoryName.includes("utilit")) {
        result[sediuId].utilitati += suma;
      } else if (subcategoryName.includes("marketing")) {
        result[sediuId].marketing += suma;
      } else if (subcategoryName.includes("consumabil") || subcategoryName.includes("materiale")) {
        result[sediuId].consumabile += suma;
      } else {
        result[sediuId].alteCheltuieli += suma;
      }
      result[sediuId].total += suma;
    }

    // Aggregate agent expenses by showroom
    for (const expense of agentExpenses) {
      const sediuId = expense.sediuId;
      if (!sediuId || !result[sediuId]) continue;

      const suma = parseFloat(expense.suma?.toString() || "0");
      const subcategoryName = expense.subcategoryId ? (subcategoryNames[expense.subcategoryId] || "") : "";

      result[sediuId].cheltuieliAgenti += suma;
      result[sediuId].total += suma;

      // Categorize agent expenses
      if (subcategoryName.includes("salar") || subcategoryName.includes("comision") || subcategoryName.includes("bonuri")) {
        result[sediuId].salarii += suma;
      } else if (subcategoryName.includes("combustibil")) {
        result[sediuId].combustibil += suma;
      } else if (subcategoryName.includes("leasing") || subcategoryName.includes("asigur") || subcategoryName.includes("revizi") || subcategoryName.includes("rovin")) {
        result[sediuId].auto += suma;
      }
    }

    return result;
  }

  async getShowroomCostsDistributedToAgents(luna: number, an: number): Promise<Record<string, {
    agentId: string;
    agentName: string;
    sediuId: string;
    sediuName: string;
    costuriShowroomDistribuite: number;
  }>> {
    // Get all showrooms
    const allSedii = await db.select().from(sedii);
    const sediuMap: Record<string, string> = {};
    for (const sediu of allSedii) {
      sediuMap[sediu.id] = sediu.nume;
    }

    // Get all agents with their sediuId
    const agents = await this.getAgents();
    const agentsBySediu: Record<string, { id: string; name: string }[]> = {};
    for (const agent of agents) {
      if (agent.sediuId) {
        if (!agentsBySediu[agent.sediuId]) {
          agentsBySediu[agent.sediuId] = [];
        }
        agentsBySediu[agent.sediuId].push({
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`
        });
      }
    }

    // Get showroom expenses (cheltuieli_sediu only - not including agent expenses)
    const sediuExpenses = await db.select().from(cheltuieliSediu).where(
      and(
        eq(cheltuieliSediu.luna, luna),
        eq(cheltuieliSediu.an, an)
      )
    );

    // Calculate total showroom costs per sediu
    const sediuCosts: Record<string, number> = {};
    for (const expense of sediuExpenses) {
      const suma = parseFloat(expense.suma?.toString() || "0");
      sediuCosts[expense.sediuId] = (sediuCosts[expense.sediuId] || 0) + suma;
    }

    // Get agent sales profitability for this month to weight distribution
    const salesData = await this.getAllAgentsSalesProfitability(an);
    const agentRevenue: Record<string, number> = {};
    for (const sale of salesData) {
      if (sale.luna === luna) {
        const venit = parseFloat(sale.venitGard?.toString() || "0") +
          parseFloat(sale.venitAcoperis?.toString() || "0");
        agentRevenue[sale.agentId] = venit;
      }
    }

    // Distribute showroom costs to agents
    const result: Record<string, {
      agentId: string;
      agentName: string;
      sediuId: string;
      sediuName: string;
      costuriShowroomDistribuite: number;
    }> = {};

    for (const [sediuId, cost] of Object.entries(sediuCosts)) {
      const sediuName = sediuMap[sediuId] || sediuId;
      const isBucuresti = sediuName.toLowerCase().includes('bucurești');

      // Apply București 20/80 rule
      const costToDistribute = isBucuresti ? cost * 0.20 : cost;

      const agentsInSediu = agentsBySediu[sediuId] || [];
      if (agentsInSediu.length === 0) continue;

      // Calculate total revenue for agents in this showroom
      let totalRevenue = 0;
      for (const agent of agentsInSediu) {
        totalRevenue += agentRevenue[agent.id] || 0;
      }

      // Distribute costs proportionally by revenue, or equally if no revenue
      for (const agent of agentsInSediu) {
        let share: number;
        if (totalRevenue > 0) {
          const agentRev = agentRevenue[agent.id] || 0;
          share = (agentRev / totalRevenue) * costToDistribute;
        } else {
          // Equal distribution if no sales data
          share = costToDistribute / agentsInSediu.length;
        }

        result[agent.id] = {
          agentId: agent.id,
          agentName: agent.name,
          sediuId: sediuId,
          sediuName: sediuName,
          costuriShowroomDistribuite: share
        };
      }
    }

    // Include agents with no showroom costs (0 cost)
    for (const agent of agents) {
      if (!result[agent.id]) {
        result[agent.id] = {
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          sediuId: agent.sediuId || "",
          sediuName: agent.sediuId ? (sediuMap[agent.sediuId] || "") : "",
          costuriShowroomDistribuite: 0
        };
      }
    }

    return result;
  }

  // Agent Manual Acquisitions methods
  async getAgentManualAchizitii(agentId: string, an: number): Promise<AgentManualAchizitii[]> {
    return db.select().from(agentManualAchizitii).where(
      and(
        eq(agentManualAchizitii.agentId, agentId),
        eq(agentManualAchizitii.an, an)
      )
    );
  }

  async getAllAgentsManualAchizitii(an: number): Promise<AgentManualAchizitii[]> {
    return db.select().from(agentManualAchizitii).where(
      eq(agentManualAchizitii.an, an)
    );
  }

  async upsertAgentManualAchizitii(data: { agentId: string; luna: number; an: number; achizitieGard?: string; achizitieAcoperis?: string }): Promise<AgentManualAchizitii> {
    // Check if exists
    const [existing] = await db.select().from(agentManualAchizitii).where(
      and(
        eq(agentManualAchizitii.agentId, data.agentId),
        eq(agentManualAchizitii.luna, data.luna),
        eq(agentManualAchizitii.an, data.an)
      )
    );

    if (existing) {
      const [updated] = await db
        .update(agentManualAchizitii)
        .set({
          achizitieGard: data.achizitieGard ?? existing.achizitieGard,
          achizitieAcoperis: data.achizitieAcoperis ?? existing.achizitieAcoperis,
          updatedAt: new Date()
        })
        .where(eq(agentManualAchizitii.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(agentManualAchizitii)
        .values({
          agentId: data.agentId,
          luna: data.luna,
          an: data.an,
          achizitieGard: data.achizitieGard ?? "0",
          achizitieAcoperis: data.achizitieAcoperis ?? "0"
        })
        .returning();
      return created;
    }
  }

  // Agent Fixed Costs methods
  async getAgentFixedCosts(agentId: string, an: number): Promise<AgentFixedCosts[]> {
    return db.select().from(agentFixedCosts).where(
      and(
        eq(agentFixedCosts.agentId, agentId),
        eq(agentFixedCosts.an, an)
      )
    );
  }

  async getAllAgentsFixedCosts(an: number): Promise<AgentFixedCosts[]> {
    return db.select().from(agentFixedCosts).where(
      eq(agentFixedCosts.an, an)
    );
  }

  async upsertAgentFixedCosts(data: {
    agentId: string;
    luna: number;
    an: number;
    salariu?: string;
    amortizareAuto?: string;
    combustibil?: string;
    revizii?: string;
    alteCheltuieliAuto?: string;
    abonamente?: string;
    diurne?: string;
    alteCheltuieli?: string;
  }): Promise<AgentFixedCosts> {
    const [existing] = await db.select().from(agentFixedCosts).where(
      and(
        eq(agentFixedCosts.agentId, data.agentId),
        eq(agentFixedCosts.luna, data.luna),
        eq(agentFixedCosts.an, data.an)
      )
    );

    if (existing) {
      const [updated] = await db
        .update(agentFixedCosts)
        .set({
          salariu: data.salariu ?? existing.salariu,
          amortizareAuto: data.amortizareAuto ?? existing.amortizareAuto,
          combustibil: data.combustibil ?? existing.combustibil,
          revizii: data.revizii ?? existing.revizii,
          alteCheltuieliAuto: data.alteCheltuieliAuto ?? existing.alteCheltuieliAuto,
          abonamente: data.abonamente ?? existing.abonamente,
          diurne: data.diurne ?? existing.diurne,
          alteCheltuieli: data.alteCheltuieli ?? existing.alteCheltuieli,
          updatedAt: new Date()
        })
        .where(eq(agentFixedCosts.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(agentFixedCosts)
        .values({
          agentId: data.agentId,
          luna: data.luna,
          an: data.an,
          salariu: data.salariu ?? "0",
          amortizareAuto: data.amortizareAuto ?? "0",
          combustibil: data.combustibil ?? "0",
          revizii: data.revizii ?? "0",
          alteCheltuieliAuto: data.alteCheltuieliAuto ?? "0",
          abonamente: data.abonamente ?? "0",
          diurne: data.diurne ?? "0",
          alteCheltuieli: data.alteCheltuieli ?? "0"
        })
        .returning();
      return created;
    }
  }

  // Salarii Neproductivi methods
  async getSalariuNeproductiv(id: string): Promise<SalariuNeproductiv | undefined> {
    const [result] = await db.select().from(salariiNeproductivi).where(eq(salariiNeproductivi.id, id));
    return result || undefined;
  }

  async getAllSalariiNeproductivi(filters?: {
    tipAngajat?: string;
    luna?: number;
    an?: number;
    numeAngajat?: string;
  }): Promise<SalariuNeproductiv[]> {
    const conditions = [];

    if (filters?.tipAngajat) {
      conditions.push(eq(salariiNeproductivi.tipAngajat, filters.tipAngajat));
    }
    if (filters?.luna) {
      conditions.push(eq(salariiNeproductivi.luna, filters.luna));
    }
    if (filters?.an) {
      conditions.push(eq(salariiNeproductivi.an, filters.an));
    }
    if (filters?.numeAngajat) {
      conditions.push(ilike(salariiNeproductivi.numeAngajat, `%${filters.numeAngajat}%`));
    }

    if (conditions.length > 0) {
      return db.select().from(salariiNeproductivi).where(and(...conditions));
    }
    return db.select().from(salariiNeproductivi);
  }

  async createSalariuNeproductiv(data: CreateSalariuNeproductiv): Promise<SalariuNeproductiv> {
    const totalCost = (
      parseFloat(data.salariuBrut || "0") +
      parseFloat(data.bonusuri || "0") +
      parseFloat(data.alteCosturi || "0")
    ).toFixed(2);

    const [result] = await db
      .insert(salariiNeproductivi)
      .values({
        numeAngajat: data.numeAngajat,
        tipAngajat: data.tipAngajat,
        luna: data.luna,
        an: data.an,
        salariuBrut: data.salariuBrut || "0",
        salariuNet: data.salariuNet || "0",
        bonusuri: data.bonusuri || "0",
        alteCosturi: data.alteCosturi || "0",
        totalCost: totalCost,
        descriere: data.descriere,
        documentUrl: data.documentUrl
      })
      .returning();
    return result;
  }

  async updateSalariuNeproductiv(id: string, data: UpdateSalariuNeproductiv): Promise<SalariuNeproductiv | undefined> {
    const existing = await this.getSalariuNeproductiv(id);
    if (!existing) return undefined;

    const salariuBrut = data.salariuBrut ?? existing.salariuBrut ?? "0";
    const bonusuri = data.bonusuri ?? existing.bonusuri ?? "0";
    const alteCosturi = data.alteCosturi ?? existing.alteCosturi ?? "0";
    const totalCost = (
      parseFloat(salariuBrut) +
      parseFloat(bonusuri) +
      parseFloat(alteCosturi)
    ).toFixed(2);

    const [result] = await db
      .update(salariiNeproductivi)
      .set({
        ...data,
        totalCost: totalCost,
        updatedAt: new Date()
      })
      .where(eq(salariiNeproductivi.id, id))
      .returning();
    return result;
  }

  async deleteSalariuNeproductiv(id: string): Promise<boolean> {
    const result = await db.delete(salariiNeproductivi).where(eq(salariiNeproductivi.id, id));
    return true;
  }

  async getSalariiNeproductiviTotals(luna: number, an: number): Promise<{
    totalProductie: number;
    totalIndirect: number;
    totalGeneral: number;
    byAngajat: Record<string, number>;
  }> {
    const salarii = await db.select().from(salariiNeproductivi).where(
      and(
        eq(salariiNeproductivi.luna, luna),
        eq(salariiNeproductivi.an, an)
      )
    );

    let totalProductie = 0;
    let totalIndirect = 0;
    const byAngajat: Record<string, number> = {};

    for (const s of salarii) {
      const cost = parseFloat(s.totalCost || "0");
      byAngajat[s.numeAngajat] = cost;

      if (s.tipAngajat === "PRODUCTIE") {
        totalProductie += cost;
      } else if (s.tipAngajat === "INDIRECT") {
        totalIndirect += cost;
      }
    }

    return {
      totalProductie,
      totalIndirect,
      totalGeneral: totalProductie + totalIndirect,
      byAngajat
    };
  }

  async bulkImportAgentFixedCosts(rows: any[]): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;
    for (const row of rows) {
      try {
        const existing = await db.select().from(agentFixedCosts).where(
          and(
            eq(agentFixedCosts.agentId, row.agentId),
            eq(agentFixedCosts.luna, row.luna),
            eq(agentFixedCosts.an, row.an)
          )
        );
        if (existing.length > 0) {
          await db.update(agentFixedCosts).set({ ...row, updatedAt: new Date() }).where(eq(agentFixedCosts.id, existing[0].id));
        } else {
          await db.insert(agentFixedCosts).values(row);
        }
        success++;
      } catch (e) {
        errors++;
      }
    }
    return { success, errors };
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getAllEmployees(filters?: { type?: string; active?: boolean }): Promise<Employee[]> {
    // 1) Ensure employees table conține înregistrări pentru utilizatorii activi
    const existingEmployees = await db.select().from(employees);

    // Dacă lipsesc angajați, sincronizăm automat utilizatorii activi în employees,
    // fără să duplicăm (cheie = prenume+nume, case-insensitive)
    const existingKeys = new Set(
      existingEmployees.map(e => `${(e.firstName || "").toLowerCase()}|${(e.lastName || "").toLowerCase()}`)
    );

    const activeUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        active: users.active,
      })
      .from(users);

    const toInsert: InsertEmployee[] = [];
    for (const user of activeUsers) {
      if (user.active === false) continue;
      const key = `${(user.firstName || "").toLowerCase()}|${(user.lastName || "").toLowerCase()}`;
      if (existingKeys.has(key)) continue;

      // Mapăm roles -> tip angajat pentru raportare
      const type: "AGENT" | "PRODUCTIE" | "INDIRECT" =
        user.role === "AGENT" || user.role === "ADMIN" ? "AGENT" : "INDIRECT";

      toInsert.push({
        firstName: user.firstName,
        lastName: user.lastName,
        type,
        showroomId: null,
        userId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: crypto.randomUUID(),
      } as any);
      existingKeys.add(key);
    }

    if (toInsert.length > 0) {
      await db.insert(employees).values(toInsert as any);
    }

    // 2) Aplicăm filtrele cerute de API
    let query = db.select().from(employees);
    const conditions = [];
    if (filters?.type) conditions.push(eq(employees.type, filters.type as any));
    if (filters?.active !== undefined) conditions.push(eq(employees.active, filters.active));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(employees.createdAt));
    }
    return await query.orderBy(desc(employees.createdAt));
  }

  async createEmployee(data: CreateEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(data as any).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, data: UpdateEmployee): Promise<Employee | undefined> {
    const [updated] = await db.update(employees).set({ ...data, updatedAt: new Date() } as any).where(eq(employees.id, id)).returning();
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    await db.delete(employees).where(eq(employees.id, id));
    return true;
  }

  // Partner Monthly Data methods
  async getPartnerMonthlyData(partnerId: string, luna: number, an: number): Promise<PartnerMonthlyData | undefined> {
    const [data] = await db.select().from(partnerMonthlyData).where(
      and(
        eq(partnerMonthlyData.partnerId, partnerId),
        eq(partnerMonthlyData.luna, luna),
        eq(partnerMonthlyData.an, an)
      )
    );
    return data;
  }

  async getAllPartnerMonthlyData(filters?: { partnerId?: string; luna?: number; an?: number }): Promise<PartnerMonthlyData[]> {
    let query = db.select().from(partnerMonthlyData);
    const conditions = [];
    if (filters?.partnerId) conditions.push(eq(partnerMonthlyData.partnerId, filters.partnerId));
    if (filters?.luna) conditions.push(eq(partnerMonthlyData.luna, filters.luna));
    if (filters?.an) conditions.push(eq(partnerMonthlyData.an, filters.an));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(partnerMonthlyData.createdAt));
    }
    return await query.orderBy(desc(partnerMonthlyData.createdAt));
  }

  async upsertPartnerMonthlyData(data: CreatePartnerMonthlyData): Promise<PartnerMonthlyData> {
    const existing = await this.getPartnerMonthlyData(data.partnerId, data.luna, data.an);
    if (existing) {
      const [updated] = await db.update(partnerMonthlyData)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(partnerMonthlyData.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db.insert(partnerMonthlyData).values(data as any).returning();
    return inserted;
  }

  // App Settings methods
  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting;
  }

  async updateAppSetting(key: string, value: string, description?: string): Promise<AppSetting> {
    const existing = await this.getAppSetting(key);
    if (existing) {
      const [updated] = await db.update(appSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return updated;
    }
    const [inserted] = await db.insert(appSettings).values({ key, value, description }).returning();
    return inserted;
  }

  // Centralized Financial Calculation
  async getFinancialReport(luna: number, an: number, endLuna?: number): Promise<any> {
    const startMonth = luna;
    const endMonth = endLuna || luna;

    // 1. Fetch all necessary data
    const agents = await this.getAgents();
    const partners = await this.getAllPartners({ tipPartener: "DISTRIBUITOR", activ: true });

    // Helper to get range condition
    const range = (table: any) => and(
      eq(table.an, an),
      gte(table.luna, startMonth),
      lte(table.luna, endMonth)
    );

    // Ensure agentSalesProfitability is up to date for all agents and all months in interval,
    // by recomputing direct din clients (folosind recomputeAgentMonthlyProfit).
    for (let month = startMonth; month <= endMonth; month++) {
      for (const agent of agents) {
        await this.recomputeAgentMonthlyProfit(agent.id, an, month);
      }
    }

    const agentsFixedCosts = await db.select().from(agentFixedCosts).where(range(agentFixedCosts));
    const agentsSales = await db.select().from(agentSalesProfitability).where(range(agentSalesProfitability));

    // Venit productie: sumă din clienți cu stadiu comandă PRODUS și câmpul Venit productie completat.
    // O treime merge în mod egal la Kuke, Marian angajat, Laurentiu (la venit total).
    const venitProductieRows = await db
      .select({ procentComision: clients.procentComision })
      .from(clients)
      .where(
        and(
          or(
            eq(clients.stadiuComanda, "PRODUS"),
            eq(clients.stadiuComanda, "LIVRAT")
          ),
          isNotNull(clients.procentComision),
          sql`TRIM(COALESCE(${clients.procentComision}, '')) != ''`,
          sql`EXTRACT(YEAR FROM COALESCE(${clients.dataVanzarii}, ${clients.updatedAt})) = ${an}`,
          sql`EXTRACT(MONTH FROM COALESCE(${clients.dataVanzarii}, ${clients.updatedAt})) >= ${startMonth}`,
          sql`EXTRACT(MONTH FROM COALESCE(${clients.dataVanzarii}, ${clients.updatedAt})) <= ${endMonth}`
        )
      );
    let totalVenitProductie = 0;
    for (const row of venitProductieRows) {
      const v = parseFloat(String(row.procentComision || "").trim().replace(",", "."));
      if (!isNaN(v)) totalVenitProductie += v;
    }
    const venitProductiePerAgent = totalVenitProductie / 3; // o treime la fiecare din cei trei
    const venitProductieAgentNames = ["kuke", "marian angajat", "laurentiu"];
    const isVenitProductieAgent = (firstName: string, lastName: string) => {
      const full = `${(firstName || "").trim()} ${(lastName || "").trim()}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return venitProductieAgentNames.some((n) => full.includes(n));
    };

    // Sum cheltuieli_agent by agentId for the period (real expenses attributed to each agent)
    const rawCheltuieliAgentInRange = await db.select().from(cheltuieliAgent).where(range(cheltuieliAgent));
    const cheltuieliAgentSumByAgentId: Record<string, number> = {};
    rawCheltuieliAgentInRange.forEach((e) => {
      const aid = e.agentId as string | null;
      if (aid) {
        cheltuieliAgentSumByAgentId[aid] = (cheltuieliAgentSumByAgentId[aid] || 0) + parseFloat(String(e.suma ?? "0"));
      }
    });

    // For neproductivi totals, we need to sum across the range
    const salariiAcrossRange = await db.select().from(salariiNeproductivi).where(range(salariiNeproductivi));
    const distributorsData = await db.select().from(partnerMonthlyData).where(range(partnerMonthlyData));

    // 2. Aggregate data
    const aggregateByAgent = (data: any[], key: string) => {
      const map = new Map<string, any>();
      data.forEach(item => {
        const existing = map.get(item[key]);
        if (!existing) {
          map.set(item[key], { ...item });
        } else {
          // Sum numeric fields
          Object.keys(item).forEach(k => {
            if (typeof item[k] === 'string' && !isNaN(parseFloat(item[k])) && k !== 'id' && k !== 'luna' && k !== 'an') {
              existing[k] = (parseFloat(existing[k]) + parseFloat(item[k])).toFixed(2);
            }
          });
        }
      });
      return map;
    };

    const agentsSalesMap = aggregateByAgent(agentsSales, 'agentId');
    const agentsFixedCostsMap = aggregateByAgent(agentsFixedCosts, 'agentId');
    const distributorsDataMap = aggregateByAgent(distributorsData, 'partnerId');

    // 3. Calculate metrics per agent
    const agentsMetrics = agents.map(agent => {
      const sales = agentsSalesMap.get(agent.id);
      const fixed = agentsFixedCostsMap.get(agent.id);

      const venitGard = parseFloat(sales?.venitGard || "0");
      const venitAcoperis = parseFloat(sales?.venitAcoperis || "0");
      const achizitieGard = parseFloat(sales?.achizitieGard || "0");
      const achizitieAcoperis = parseFloat(sales?.achizitieAcoperis || "0");
      let venitTotal = venitGard + venitAcoperis;
      // Venit productie: o treime la Kuke, Marian angajat, Laurentiu (doar dacă există sumă)
      if (venitProductiePerAgent > 0 && isVenitProductieAgent(agent.firstName, agent.lastName)) {
        venitTotal += venitProductiePerAgent;
      }
      const achizitieTotal = achizitieGard + achizitieAcoperis;
      const adaosTVA = venitTotal - achizitieTotal;

      const totalCostFixed = parseFloat(fixed?.salariu || "0") +
        parseFloat(fixed?.amortizareAuto || "0") +
        parseFloat(fixed?.combustibil || "0") +
        parseFloat(fixed?.revizii || "0") +
        parseFloat(fixed?.alteCheltuieliAuto || "0") +
        parseFloat(fixed?.abonamente || "0") +
        parseFloat(fixed?.diurne || "0") +
        parseFloat(fixed?.alteCheltuieli || "0");

      // Cheltuieli agent = sum of all cheltuieli_agent attributed to this agent in the period (real expenses)
      const cheltuieliAgent = cheltuieliAgentSumByAgentId[agent.id] ?? 0;

      // Cheltuieli showroom pentru acest agent (calculate mai jos, după ce avem showroomTotals)
      // Inițial 0; vom completa după ce construim o hartă sediu -> share per agent
      const cheltuieliShowroom = 0;

      // Cheltuieli indirecte (Cota parte) per agent – vom calcula o valoare comună ulterior
      const cheltuieliIndirecte = 0;

      const profitOperational = adaosTVA - (cheltuieliAgent + cheltuieliShowroom + cheltuieliIndirecte);

      // Comision %: valoare fixă 15% (la cerere)
      const comisionPercent = 15;
      // Comision RON se calculează din valoarea absolută a profitului operațional,
      // astfel încât să fie întotdeauna un cost pozitiv care se SCADĂ.
      const comisionValoare = Math.abs(profitOperational) * (comisionPercent / 100);

      const profitBrut = profitOperational - comisionValoare;

      const totalAdaos = venitTotal - achizitieTotal;
      const profitNet = profitBrut;

      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        venitGard,
        venitAcoperis,
        achizitieGard,
        achizitieAcoperis,
        venitTotal,
        achizitieTotal,
        adaosTVA,
        totalAdaos,
        totalCostFixed,
        cheltuieliAgent,
        cheltuieliShowroom,
        cheltuieliIndirecte,
        profitOperational,
        comisionPercent,
        comisionValoare,
        profitBrut,
        profitNet,
      };
    });

    // 4. Calculate metrics per distributor
    const distributorsMetrics = partners.map(p => {
      const data = distributorsDataMap.get(p.id);
      if (!data) return { id: p.id, name: p.nume, profitNet: 0 };

      const venitTva = parseFloat(data.venitTva || "0");
      const achizitieTva = parseFloat(data.achizitieTva || "0");
      const comisionPercent = parseFloat(data.comisionPercent || "0") / (data.count || 1); // Avg comision if multiple months
      const cheltuieliMarketing = parseFloat(data.cheltuieliMarketing || "0");
      const costTransport = parseFloat(data.costTransport || "0");
      const costAmbalare = parseFloat(data.costAmbalare || "0");

      const venitNet = venitTva / 1.19;
      const achizitieNet = achizitieTva / 1.19;
      const adaos = venitNet - achizitieNet;
      const comisionValoare = venitNet * (comisionPercent / 100);

      const profitNet = adaos - comisionValoare - cheltuieliMarketing - costTransport - costAmbalare;

      return {
        id: p.id,
        name: p.nume,
        profitNet
      };
    });

    // 5. Showroom Totals
    const sediiList = await db.select().from(sedii);

    // Harta agent -> sediu (pentru a repartiza cheltuielile vechi fără sediu)
    const agentSediuMap: Record<string, string | null> = {};
    const normalizeName = (n: string | null | undefined) =>
      (n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const centralSediu = sediiList.find(
      (s) =>
        normalizeName(s.nume) === "sediu central bucuresti" ||
        normalizeName(s.nume) === "sediu central (bucuresti)" ||
        normalizeName(s.nume) === "sediu central bucuresti ",
    );
    const constantaSediu = sediiList.find(
      (s) => normalizeName(s.nume) === "showroom constanta",
    );
    const giurgiuSediu = sediiList.find(
      (s) => normalizeName(s.nume) === "showroom giurgiu",
    );
    const teleormanSediu = sediiList.find(
      (s) =>
        normalizeName(s.nume) === "showroom teleorman" ||
        normalizeName(s.nume) === "showroom tr",
    );

    const centralAgents = new Set(
      [
        // Nume actuale de user în aplicație
        "daniel daniel",
        "raluca raluca",
        "dana dana",
        "madalina madalina",
        "iulian iulian",
        "dragos frangache",
        "alexandru croitoru",
        "marian costache",
      ].map((n) => normalizeName(n)),
    );
    const constantaAgents = new Set(
      ["oana frangache", "razvan rosu"].map((n) => normalizeName(n)),
    );
    const giurgiuAgents = new Set(
      ["marian toma"].map((n) => normalizeName(n)),
    );
    const teleormanAgents = new Set(
      ["alexandra"].map((n) => normalizeName(n)),
    );

    for (const agent of agents) {
      if (!agent.id) continue;
      const fullName = normalizeName(`${agent.firstName} ${agent.lastName}`);

      let sediuId: string | null =
        ((agent as any).sediuId as string | null) || null;

      if (centralSediu && centralAgents.has(fullName)) {
        sediuId = centralSediu.id;
      } else if (constantaSediu && constantaAgents.has(fullName)) {
        sediuId = constantaSediu.id;
      } else if (giurgiuSediu && giurgiuAgents.has(fullName)) {
        sediuId = giurgiuSediu.id;
      } else if (
        teleormanSediu &&
        (teleormanAgents.has(fullName) ||
          normalizeName(agent.firstName) === "alexandra")
      ) {
        sediuId = teleormanSediu.id;
      }

      agentSediuMap[agent.id] = sediuId;
    }

    // Normalizăm anumite sedii vechi (ex: „Showroom București”) către cele noi (ex: „Sediu central București”)
    const sediuCentral = sediiList.find((s) => s.nume === "Sediu central București");
    const aliasToCentralIds = new Set<string>(
      sediiList
        .filter((s) => s.nume === "Showroom București")
        .map((s) => s.id),
    );
    const normalizeSediuId = (id: string | null) => {
      if (!id) return id;
      if (sediuCentral && aliasToCentralIds.has(id)) {
        return sediuCentral.id;
      }
      return id;
    };

    const rawCheltuieliSediuList = await db.select().from(cheltuieliSediu).where(range(cheltuieliSediu));
    const rawCheltuieliAgentList = await db.select().from(cheltuieliAgent).where(range(cheltuieliAgent));

    const cheltuieliSediuList = rawCheltuieliSediuList.map((e) => ({
      ...e,
      sediuId: normalizeSediuId(e.sediuId as any),
    }));
    const cheltuieliAgentList = rawCheltuieliAgentList.map((e) => {
      const originalSediuId = (e.sediuId as any) || (e.agentId ? agentSediuMap[e.agentId as any] : null);
      return {
        ...e,
        sediuId: normalizeSediuId(originalSediuId),
      };
    });

    // Pentru raportul de profitabilitate, „Cheltuieli showroom” trebuie să fie toate Cheltuielile generale
    // (categoria `cat-generale`) atribuite showroom-ului, indiferent dacă sunt în CHELTUIELI SEDIU sau
    // CHELTUIELI AGENT. Suma aceasta se împarte egal între oamenii din showroom-ul respectiv.
    const showroomTotals = sediiList.map(s => {
      const expenses = cheltuieliSediuList.filter(
        c => c.sediuId === s.id && c.categoryId === "cat-generale",
      );
      const agentExps = cheltuieliAgentList.filter(
        c => c.sediuId === s.id && c.categoryId === "cat-generale",
      );

      let totalGenerale = 0;
      expenses.forEach(e => {
        totalGenerale += parseFloat(e.suma);
      });
      agentExps.forEach(e => {
        totalGenerale += parseFloat(e.suma);
      });

      return {
        id: s.id,
        name: s.nume,
        totalGenerale,
      };
    });

    // 6. Compute per-agent showroom share and cota parte (indirect) share

    // Număr agenți pe showroom: folosim agentSediuMap (hardcodat după nume) ca să atribuim corect
    const agentsByShowroom: Record<string, string[]> = {};
    agents.forEach((agent) => {
      const rawSediuId = agentSediuMap[agent.id] ?? (agent as any).sediuId ?? null;
      const normSediuId = normalizeSediuId(rawSediuId);
      if (!normSediuId) return;
      if (!agentsByShowroom[normSediuId]) agentsByShowroom[normSediuId] = [];
      agentsByShowroom[normSediuId].push(agent.id);
    });

    // Map showroomId -> total cheltuieli showroom (doar Cheltuieli generale)
    const showroomTotalMap: Record<string, number> = {};
    showroomTotals.forEach((st) => {
      showroomTotalMap[st.id] = st.totalGenerale;
    });

    // Cheltuieli showroom per agent: total showroom / număr agenți în acel showroom
    const cheltShowroomPerAgent: Record<string, number> = {};
    Object.entries(agentsByShowroom).forEach(([sediuId, agentIds]) => {
      const total = showroomTotalMap[sediuId] || 0;
      if (!total || agentIds.length === 0) return;
      const share = total / agentIds.length;
      agentIds.forEach((aid) => {
        cheltShowroomPerAgent[aid] = share;
      });
    });

    // Cheltuieli Cota parte totale în interval (atât de sediu, cât și de agent)
    let totalCotaParte = 0;
    cheltuieliSediuList.forEach((e) => {
      if (e.categoryId === "cat-cota-parte") {
        totalCotaParte += parseFloat((e as any).suma || "0");
      }
    });
    cheltuieliAgentList.forEach((e) => {
      if (e.categoryId === "cat-cota-parte") {
        totalCotaParte += parseFloat((e as any).suma || "0");
      }
    });

    // Cheltuielile „Cota parte” se împart doar între agenții activi de vânzări:
    // Dragos Frangache, Oana Frangache, Marian Costache, Razvan Rosu, Alexandru Croitoru
    const cotaParteAgentsNames = new Set(
      [
        "dragos frangache",
        "oana frangache",
        "marian costache",
        "razvan rosu",
        "alexandru croitoru",
      ].map((n) => n.toLowerCase()),
    );

    const cotaParteAgentIds: string[] = [];
    agents.forEach((a) => {
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      if (cotaParteAgentsNames.has(fullName)) {
        cotaParteAgentIds.push(a.id);
      }
    });

    const numAgentsCota = cotaParteAgentIds.length || 1;
    const shareIndirect = totalCotaParte / numAgentsCota;
    const cheltIndirectPerAgentMap: Record<string, number> = {};
    cotaParteAgentIds.forEach((id) => {
      cheltIndirectPerAgentMap[id] = shareIndirect;
    });

    // Actualizăm metricii agenților cu cheltuieli showroom + indirecte + profit recalculat
    const agentsMetricsWithCosts = agentsMetrics.map((m) => {
      const cheltShowroom = cheltShowroomPerAgent[m.id] || 0;
      const cheltIndirecte = cheltIndirectPerAgentMap[m.id] || 0;
      const cheltAgent = m.cheltuieliAgent ?? m.totalCostFixed ?? 0;

      const profitOperational = m.adaosTVA - (cheltAgent + cheltShowroom + cheltIndirecte);
      const comisionPercent = m.comisionPercent ?? 0;
      // Comision RON se calculează din valoarea absolută a profitului operațional,
      // astfel încât să fie întotdeauna un cost pozitiv care se SCADĂ.
      const comisionValoare = Math.abs(profitOperational) * (comisionPercent / 100);
      const profitBrut = profitOperational - comisionValoare;

      return {
        ...m,
        cheltuieliShowroom: cheltShowroom,
        cheltuieliIndirecte: cheltIndirecte,
        profitOperational,
        comisionPercent,
        comisionValoare,
        profitBrut,
        profitNet: profitBrut,
      };
    });

    // 7. Aggregate totals
    let totalCostProductie = 0;
    let totalCostIndirect = 0;
    salariiAcrossRange.forEach(s => {
      const cost = parseFloat(s.totalCost || "0");
      if (s.tipAngajat === "PRODUCTIE") totalCostProductie += cost;
      else if (s.tipAngajat === "INDIRECT") totalCostIndirect += cost;
    });

    const totalProfitAgents = agentsMetricsWithCosts.reduce((sum, a) => sum + (a.profitNet || 0), 0);
    const totalProfitDistributors = distributorsMetrics.reduce((sum, d) => sum + d.profitNet, 0);

    const profitGrup = totalProfitAgents + totalProfitDistributors - totalCostIndirect - totalCostProductie;

    return {
      startMonth,
      endMonth,
      an,
      agentsMetrics: agentsMetricsWithCosts,
      distributorsMetrics,
      showroomTotals,
      totals: {
        totalProfitAgents,
        totalProfitDistributors,
        totalCostIndirect,
        totalCostProductie,
        profitGrup
      }
    };
  }

  async getPartnerSalesForPeriod(
    partnerId: string,
    luna: number,
    an: number
  ): Promise<{
    id: string;
    nume: string;
    dataVanzarii: Date | null;
    valoareOferta: string | null;
    pretAchizitie: string | null;
    achizitiePartener: string | null;
  }[]> {
    const startDate = new Date(an, luna - 1, 1);
    const endDate = new Date(an, luna, 0, 23, 59, 59);

    const rows = await db
      .select({
        id: clients.id,
        nume: clients.nume,
        dataVanzarii: clients.dataVanzarii,
        updatedAt: clients.updatedAt,
        stadiuOferta: clients.stadiuOferta,
        valoareOferta: clients.valoareOferta,
        pretAchizitie: clients.pretAchizitie,
        achizitiePartener: clients.achizitiePartener,
        partnerId: clients.partnerId,
      })
      .from(clients)
      .where(
        and(
          eq(clients.partnerId, partnerId),
          eq(clients.stadiuOferta, "VANDUT"),
          or(
            and(gte(clients.dataVanzarii, startDate), lte(clients.dataVanzarii, endDate)),
            and(sql`${clients.dataVanzarii} IS NULL`, gte(clients.updatedAt, startDate), lte(clients.updatedAt, endDate))
          )
        )
      )
      .orderBy(clients.dataVanzarii);

    return rows.map((r) => ({
      id: r.id,
      nume: r.nume,
      dataVanzarii: r.dataVanzarii,
      valoareOferta: r.valoareOferta,
      pretAchizitie: (r as any).pretAchizitie || null,
      achizitiePartener: (r as any).achizitiePartener || null,
    }));
  }
}

export const storage = new DatabaseStorage();
