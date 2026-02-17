import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Phone, MapPin, Clock } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Client } from "@shared/schema";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function Followup() {
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

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
    queryKey: ["followups", selectedDate, selectedAgent],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDate) {
        params.set("date", selectedDate.toISOString());
      }
      if (isAdmin && selectedAgent && selectedAgent !== "all") {
        params.set("agentId", selectedAgent);
      }
      const res = await fetch(`/api/followups?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea follow-up-urilor");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const getFollowupLevel = (client: Client): string => {
    if (!selectedDate) return "-";
    const day = format(selectedDate, "yyyy-MM-dd");

    const d1 = client.dataRevenire1 ? format(new Date(client.dataRevenire1), "yyyy-MM-dd") : null;
    const d2 = client.dataRevenire2 ? format(new Date(client.dataRevenire2), "yyyy-MM-dd") : null;
    const d3 = client.dataRevenire3 ? format(new Date(client.dataRevenire3), "yyyy-MM-dd") : null;

    if (d1 === day) return "Follow-up 1";
    if (d2 === day) return "Follow-up 2";
    if (d3 === day) return "Follow-up 3";
    return "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/40">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Follow-up azi</h1>
            <p className="text-slate-400">
              Toți clienții care au follow-up programat în ziua selectată (1, 2 sau 3)
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="h-5 w-5" />
            Filtre Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-4", isAdmin ? "md:grid-cols-3" : "md:grid-cols-2")}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data follow-up</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ro }) : "Selectează data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează agent" />
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
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Follow-up pentru {selectedDate ? format(selectedDate, "dd.MM.yyyy") : "-"} ({clients.length} clienți)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nu există follow-up-uri pentru data selectată.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Stadiu ofertă</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.nume}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {client.telefon && (
                            <a
                              href={`tel:${client.telefon.replace(/\s+/g, "")}`}
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {client.telefon}
                            </a>
                          )}
                          {client.email && (
                            <span className="text-xs text-slate-400">{client.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {[client.localitate, client.judet].filter(Boolean).join(", ") || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {getFollowupLevel(client)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {client.stadiuOferta || "NOUA"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

