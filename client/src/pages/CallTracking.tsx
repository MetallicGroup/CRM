import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Phone, Search, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { addDays } from "date-fns";
import { useAuth } from "@/lib/auth";
import type { Client, OfferStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const FOLLOW_UP_STATUSES: OfferStatus[] = ["IN_ASTEPTARE", "TRIMISA", "ACCEPTATA"];

export default function CallTracking() {
  const { isAdmin } = useAuth();
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyFollowUp, setOnlyFollowUp] = useState<boolean>(true);
  const [search, setSearch] = useState("");
   // interval implicit: ultimele 30 de zile
  const [dateFrom, setDateFrom] = useState<Date | undefined>(addDays(new Date(), -30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["call-tracking", agentFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentFilter !== "all") {
        params.set("agentId", agentFilter);
      }
      if (statusFilter !== "all") {
        params.set("stadiuOferta", statusFilter);
      }
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea clienților");
      return res.json();
    },
  });

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (onlyFollowUp && !FOLLOW_UP_STATUSES.includes((client.stadiuOferta || "NOUA") as OfferStatus)) {
        return false;
      }

      if (search) {
        const term = search.toLowerCase();
        const matchesSearch =
          client.nume.toLowerCase().includes(term) ||
          client.telefon?.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Filtrare după interval de dată: folosim în primul rând data ultimului apel, altfel data adăugării clientului
      const lastCallRaw = (client as any).lastCallAt as string | undefined;
      const baseDate = lastCallRaw ? new Date(lastCallRaw) : client.createdAt ? new Date(client.createdAt as any) : undefined;

      if (dateFrom && baseDate && baseDate < dateFrom) return false;
      if (dateTo && baseDate && baseDate > addDays(dateTo, 1)) return false;

      return true;
    });
  }, [clients, onlyFollowUp, search, dateFrom, dateTo]);

  const totalWithFollowUp = filteredClients.length;
  const totalCalled = filteredClients.filter((c) => (c as any).callCount && (c as any).callCount > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <Phone className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Monitorizare Apeluri Clienți</h1>
            <p className="text-muted-foreground">
              Vezi rapid câți clienți în follow-up au fost sunați și de către cine.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clienți în Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalWithFollowUp}</p>
            <p className="text-xs text-muted-foreground">
              Stări: {FOLLOW_UP_STATUSES.join(", ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clienți sunați</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{totalCalled}</p>
            <p className="text-xs text-muted-foreground">
              Cel puțin un click pe număr în CRM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rată contactare</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalWithFollowUp > 0 ? Math.round((totalCalled / totalWithFollowUp) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">
              Clienți sunați / clienți în follow-up
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume, telefon sau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[220px]">
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alege agentul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți agenții</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[220px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Stadiu ofertă" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate stadiile</SelectItem>
                  <SelectItem value="NOUA">Nouă</SelectItem>
                  <SelectItem value="TRIMISA">Trimisă</SelectItem>
                  <SelectItem value="IN_ASTEPTARE">În așteptare</SelectItem>
                  <SelectItem value="ACCEPTATA">Acceptată</SelectItem>
                  <SelectItem value="VANDUT">Vândut</SelectItem>
                  <SelectItem value="REFUZAT">Refuzat</SelectItem>
                  <SelectItem value="ANULATA">Anulată</SelectItem>
                <SelectItem value="INFORMATII">Informații</SelectItem>
                <SelectItem value="CONTACTAT">Contactat</SelectItem>
                <SelectItem value="NECONTACTAT">Necontactat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[260px] flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-full",
                      !dateFrom && !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom || dateTo ? (
                      <>
                        {dateFrom && dateFrom.toLocaleDateString("ro-RO")} –{" "}
                        {dateTo && dateTo.toLocaleDateString("ro-RO")}
                      </>
                    ) : (
                      <span>Interval dată</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">De la</p>
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => setDateFrom(date || undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Până la</p>
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => setDateTo(date || undefined)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="onlyFollowUp"
                type="checkbox"
                checked={onlyFollowUp}
                onChange={(e) => setOnlyFollowUp(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="onlyFollowUp" className="text-sm">
                Afișează doar clienți în follow-up
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detaliu apeluri pe client</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nu există clienți care să corespundă filtrului.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stadiu ofertă</TableHead>
                  <TableHead>Data adăugării</TableHead>
                  <TableHead>Apel</TableHead>
                  <TableHead>Nr. apeluri</TableHead>
                  <TableHead>Ultimul apel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const hasCalls = (client as any).callCount && (client as any).callCount > 0;
                  const lastCallAt = (client as any).lastCallAt
                    ? new Date((client as any).lastCallAt as any)
                    : null;
                  const createdAt = client.createdAt ? new Date(client.createdAt as any) : null;
                  const agentName =
                    agents.find((a) => a.id === client.agentId)?.firstName +
                      " " +
                      (agents.find((a) => a.id === client.agentId)?.lastName || "") ||
                    client.agentId ||
                    "Neasignat";

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.nume}</span>
                          <span className="text-xs text-muted-foreground">
                            {(client.localitate || client.judet) &&
                              [client.localitate, client.judet].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {agentName.trim()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {createdAt ? (
                          <span className="text-xs text-muted-foreground">
                            {createdAt.toLocaleDateString("ro-RO")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <a
                            href={client.telefon ? `tel:${client.telefon.replace(/\s+/g, "")}` : undefined}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {client.telefon}
                          </a>
                          {client.email && (
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {client.stadiuOferta || "NOUA"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasCalls ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Sunat
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Fără click</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm", hasCalls ? "font-semibold" : "text-muted-foreground")}>
                          {(client as any).callCount || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lastCallAt ? (
                          <span className="text-xs text-muted-foreground">
                            {lastCallAt.toLocaleDateString("ro-RO")} {lastCallAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

