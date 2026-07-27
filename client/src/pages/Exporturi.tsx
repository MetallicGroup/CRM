import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, Download, FileText, Search } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ActivitySummary {
  totalLeadsAuto: number;
  totalLeadsManual: number;
  totalPhoneClicks: number;
  totalStatusChanges: number;
  totalFollowupClicks: number;
  totalInactivitySeconds: number;
  inactivityIntervals: Array<{ start: string; end: string; duration: string }>;
}

interface ActivityDetail {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  type: "LEAD_AUTO" | "LEAD_MANUAL" | "STATUS_CHANGE" | "PHONE_CLICK" | "FOLLOWUP_CLICK" | "OFFER_FILE_CHANGE";
  createdAt: string;
  meta: Record<string, any> | null;
  clientNotes: string | null;
}

export default function Exporturi() {
  const { isAdmin, user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [ownerAgentId, setOwnerAgentId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfDay(new Date()));
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get("agentId");
    const from = params.get("from");
    const to = params.get("to");

    if (agentId) {
      setSelectedAgent(agentId);
    } else if (!isAdmin && user?.id) {
      // For non-admins, default to their own ID
      setSelectedAgent(user.id);
    }

    if (from) {
      setDateFrom(new Date(from));
    }
    if (to) {
      setDateTo(new Date(to));
    }
  }, [isAdmin, user]);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: activitySummary, isLoading } = useQuery<ActivitySummary>({
    queryKey: ["activity-summary", selectedAgent, ownerAgentId, dateFrom, dateTo],
    queryFn: async () => {
      if (selectedAgent === "all" || !dateFrom || !dateTo) {
        return {
          totalLeadsAuto: 0,
          totalLeadsManual: 0,
          totalPhoneClicks: 0,
          totalStatusChanges: 0,
          totalFollowupClicks: 0,
          totalInactivitySeconds: 0,
          inactivityIntervals: [],
        };
      }

      const params = new URLSearchParams({
        agentId: selectedAgent,
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      });

      if (ownerAgentId && ownerAgentId !== "all") {
        params.set("ownerAgentId", ownerAgentId);
      }

      const res = await fetch(`/api/activity/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea raportului");
      return res.json();
    },
    enabled: selectedAgent !== "all" && !!dateFrom && !!dateTo,
  });

  const { data: activityDetails = [], isLoading: isLoadingDetails } = useQuery<ActivityDetail[]>({
    queryKey: ["activity-details", selectedAgent, ownerAgentId, dateFrom, dateTo],
    queryFn: async () => {
      if (selectedAgent === "all" || !dateFrom || !dateTo) return [];
      const params = new URLSearchParams({
        agentId: selectedAgent,
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      });

      if (ownerAgentId && ownerAgentId !== "all") {
        params.set("ownerAgentId", ownerAgentId);
      }
      const res = await fetch(`/api/activity/details?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea detaliilor");
      return res.json();
    },
    enabled: selectedAgent !== "all" && !!dateFrom && !!dateTo,
  });

  const handleExportDaily = () => {
    if (!selectedAgent || selectedAgent === "all") {
      alert("Selectați un agent pentru export");
      return;
    }
    const today = new Date();
    setDateFrom(startOfDay(today));
    setDateTo(endOfDay(today));
  };

  const handleExportWeekly = () => {
    if (!selectedAgent || selectedAgent === "all") {
      alert("Selectați un agent pentru export");
      return;
    }
    const now = new Date();
    setDateFrom(startOfWeek(now, { weekStartsOn: 1 }));
    setDateTo(endOfWeek(now, { weekStartsOn: 1 }));
  };

  const handleExportMonthly = () => {
    if (!selectedAgent || selectedAgent === "all") {
      alert("Selectați un agent pentru export");
      return;
    }
    const now = new Date();
    setDateFrom(startOfMonth(now));
    setDateTo(endOfMonth(now));
  };

  const summary = activitySummary || {
    totalLeadsAuto: 0,
    totalLeadsManual: 0,
    totalPhoneClicks: 0,
    totalStatusChanges: 0,
    totalFollowupClicks: 0,
    totalInactivitySeconds: 0,
    inactivityIntervals: [],
  };

  // Format total inactivity time
  const formatInactivityTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Rapoarte Export</h1>
            <p className="text-slate-400">
              Rapoarte de activitate pentru agenți - export zilnic, săptămânal sau lunar
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2", isAdmin ? "md:grid-cols-5" : "md:grid-cols-3")}>
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent (acțiune)</label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectați agent" />
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Proprietar client</label>
                  <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toți proprietarii" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți proprietarii</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de la</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ro }) : "Selectați data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data până la</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ro }) : "Selectați data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Export rapid</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDaily}
                    disabled={selectedAgent === "all"}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Zilnic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportWeekly}
                    disabled={selectedAgent === "all"}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Săptămânal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMonthly}
                    disabled={selectedAgent === "all"}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Lunar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAgent !== "all" && dateFrom && dateTo && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Raport Activitate - {agents.find((a) => a.id === selectedAgent)?.firstName}{" "}
                {agents.find((a) => a.id === selectedAgent)?.lastName}
              </CardTitle>
              <p className="text-sm text-slate-400">
                Perioada: {format(dateFrom, "PPP", { locale: ro })} - {format(dateTo, "PPP", { locale: ro })}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metrică</TableHead>
                      <TableHead className="text-right">Valoare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Lead-uri automate (Facebook, etc.)</TableCell>
                      <TableCell className="text-right">{summary.totalLeadsAuto}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Lead-uri adăugate manual</TableCell>
                      <TableCell className="text-right">{summary.totalLeadsManual}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Click-uri pe număr de telefon</TableCell>
                      <TableCell className="text-right">{summary.totalPhoneClicks}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Schimbări de status</TableCell>
                      <TableCell className="text-right">{summary.totalStatusChanges}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Click-uri pe Follow-up efectuat</TableCell>
                      <TableCell className="text-right">{summary.totalFollowupClicks}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">Total activități</TableCell>
                      <TableCell className="text-right font-bold">
                        {summary.totalLeadsAuto +
                          summary.totalLeadsManual +
                          summary.totalPhoneClicks +
                          summary.totalStatusChanges +
                          summary.totalFollowupClicks}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total inactivitate</TableCell>
                      <TableCell className="text-right">
                        {formatInactivityTime(summary.totalInactivitySeconds)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detaliu acțiuni pe clienți</CardTitle>
              <p className="text-sm text-slate-400">
                Se afișează pe care clienți a lucrat agentul, ce tip de acțiune a făcut și din ce status în ce status a schimbat.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activityDetails.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-sm">
                  Nu există acțiuni înregistrate în perioada selectată.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Ora</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Tip acțiune</TableHead>
                        <TableHead>Detaliu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityDetails.map((row) => {
                        let actionLabel = "";
                        let detail = "";

                        if (row.type === "LEAD_AUTO") {
                          actionLabel = "Lead automat";
                          detail = "Client încărcat automat (ex. Facebook)";
                        } else if (row.type === "LEAD_MANUAL") {
                          actionLabel = "Lead manual";
                          detail = "Client adăugat manual în CRM";
                        } else if (row.type === "PHONE_CLICK") {
                          actionLabel = "Click telefon";
                          detail = "S-a dat click pe numărul de telefon";
                        } else if (row.type === "STATUS_CHANGE") {
                          actionLabel = "Schimbare status";
                          const fromStatus = (row.meta?.from as string | undefined) || "";
                          const toStatus = (row.meta?.to as string | undefined) || "";
                          detail = fromStatus && toStatus
                            ? `Din ${fromStatus} în ${toStatus}`
                            : "Schimbare stadiu ofertă";
                        } else if (row.type === "FOLLOWUP_CLICK") {
                          actionLabel = "Follow-up efectuat";
                          const nr = row.meta?.followUpNumber as number | undefined;
                          detail = nr ? `Follow-up ${nr} bifat ca efectuat` : "Follow-up bifat ca efectuat";
                        } else if (row.type === "OFFER_FILE_CHANGE") {
                          actionLabel = "Fișier ofertă";
                          const slot = row.meta?.slot as number | undefined;
                          const action = row.meta?.action as string | undefined;
                          const actionRo =
                            action === "upload" ? "încărcat" :
                            action === "replace" ? "înlocuit" :
                            action === "clear" ? "șters" : "modificat";
                          detail = `Ofertă ${slot ?? "?"} ${actionRo}`;
                        }

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {format(new Date(row.createdAt), "dd.MM.yyyy HH:mm", { locale: ro })}
                            </TableCell>
                            <TableCell className="text-sm">
                              <button
                                type="button"
                                className="text-blue-600 hover:underline"
                                onClick={() => setSelectedActivity(row)}
                              >
                                {row.clientName}
                              </button>
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.clientPhone || "-"}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {actionLabel}
                            </TableCell>
                            <TableCell className="text-sm text-slate-400">
                              {detail}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {summary.inactivityIntervals && summary.inactivityIntervals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Intervale de inactivitate</CardTitle>
                <p className="text-sm text-slate-400">
                  Perioade în care nu a existat activitate în CRM (gap &gt;30 secunde)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {summary.inactivityIntervals.map((interval, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {interval.start} - {interval.end}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {interval.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedAgent === "all" && isAdmin && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">
            Selectați un agent pentru a vedea raportul de activitate
          </CardContent>
        </Card>
      )}

      {selectedActivity && (
        <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalii client - {selectedActivity.clientName}</DialogTitle>
              <DialogDescription>
                Activitate efectuată de agent în perioada selectată
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Telefon</p>
                  <p className="font-medium">
                    {selectedActivity.clientPhone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Data/Ora acțiunii</p>
                  <p className="font-medium">
                    {format(new Date(selectedActivity.createdAt), "dd.MM.yyyy HH:mm", { locale: ro })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Tip acțiune</p>
                  <p className="font-medium">
                    {selectedActivity.type === "LEAD_AUTO" && "Lead automat"}
                    {selectedActivity.type === "LEAD_MANUAL" && "Lead manual"}
                    {selectedActivity.type === "PHONE_CLICK" && "Click telefon"}
                    {selectedActivity.type === "STATUS_CHANGE" && "Schimbare status"}
                    {selectedActivity.type === "FOLLOWUP_CLICK" && "Follow-up efectuat"}
                    {selectedActivity.type === "OFFER_FILE_CHANGE" && "Fișier ofertă"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Detaliu</p>
                  <p className="font-medium">
                    {selectedActivity.type === "LEAD_AUTO" && "Client încărcat automat (ex. Facebook)"}
                    {selectedActivity.type === "LEAD_MANUAL" && "Client adăugat manual în CRM"}
                    {selectedActivity.type === "PHONE_CLICK" && "S-a dat click pe numărul de telefon"}
                    {selectedActivity.type === "STATUS_CHANGE" && (() => {
                      const fromStatus = (selectedActivity.meta?.from as string | undefined) || "";
                      const toStatus = (selectedActivity.meta?.to as string | undefined) || "";
                      return fromStatus && toStatus
                        ? `Din ${fromStatus} în ${toStatus}`
                        : "Schimbare stadiu ofertă";
                    })()}
                    {selectedActivity.type === "FOLLOWUP_CLICK" && (() => {
                      const nr = selectedActivity.meta?.followUpNumber as number | undefined;
                      return nr ? `Follow-up ${nr} bifat ca efectuat` : "Follow-up bifat ca efectuat";
                    })()}
                    {selectedActivity.type === "OFFER_FILE_CHANGE" && (() => {
                      const slot = selectedActivity.meta?.slot as number | undefined;
                      const action = selectedActivity.meta?.action as string | undefined;
                      const actionRo =
                        action === "upload" ? "încărcat" :
                        action === "replace" ? "înlocuit" :
                        action === "clear" ? "șters" : "modificat";
                      return `Ofertă ${slot ?? "?"} ${actionRo}`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-slate-400">Observații client</p>
                <p className="font-medium whitespace-pre-wrap">
                  {selectedActivity.clientNotes && selectedActivity.clientNotes.trim().length > 0
                    ? selectedActivity.clientNotes
                    : "Nu există observații salvate pentru acest client."}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
