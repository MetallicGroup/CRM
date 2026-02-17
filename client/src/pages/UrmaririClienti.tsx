import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Search, User, Phone, Mail, MapPin, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Client, OfferStatus } from "@shared/schema";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string; color: string }[] = [
  { value: "NOUA", label: "Nouă", color: "bg-blue-500/25 text-blue-200 border border-blue-500/40" },
  { value: "TRIMISA", label: "Trimisă", color: "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40" },
  { value: "IN_ASTEPTARE", label: "În Așteptare (Follow-up)", color: "bg-yellow-500/25 text-yellow-200 border border-yellow-500/40" },
  { value: "ACCEPTATA", label: "Acceptată", color: "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40" },
  { value: "VANDUT", label: "Vândut", color: "bg-green-500/25 text-green-200 border border-green-500/40" },
  { value: "REFUZAT", label: "Refuzat/Pierdut", color: "bg-red-500/25 text-red-200 border border-red-500/40" },
  { value: "ANULATA", label: "Anulată", color: "bg-slate-500/25 text-slate-300 border border-slate-500/40" },
  { value: "INFORMATII", label: "Informații", color: "bg-purple-500/25 text-purple-200 border border-purple-500/40" },
  { value: "CONTACTAT", label: "Contactat", color: "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40" },
  { value: "NECONTACTAT", label: "Necontactat", color: "bg-orange-500/25 text-orange-200 border border-orange-500/40" },
];

function getOfferStatusBadge(status: OfferStatus | null) {
  if (!status) return <Badge className="bg-slate-700/60 text-slate-400 border border-slate-600/50">-</Badge>;
  const option = OFFER_STATUS_OPTIONS.find(s => s.value === status);
  return (
    <Badge className={cn("font-medium", option?.color)}>
      {option?.label || status}
    </Badge>
  );
}

export default function UrmaririClienti() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
    queryKey: ["observed-clients", agentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("underObservation", "true");
      if (agentFilter !== "all") {
        params.set("agentId", agentFilter);
      }
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la încărcarea clienților");
      return res.json();
    },
  });

  const removeObservationMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await fetch(`/api/clients/${clientId}/toggle-observation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Eroare la eliminarea observației");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observed-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const filteredClients = clients.filter((client) => {
    if (search) {
      const term = search.toLowerCase();
      const matchesSearch =
        client.nume.toLowerCase().includes(term) ||
        client.telefon?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.localitate?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Neasignat";
    const agent = agents.find((a) => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Necunoscut";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Eye className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Urmăriri Clienți</h1>
            <p className="text-slate-400">
              Clienți marcați pentru observație și analiză ulterioară
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
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
              <label className="text-sm font-medium">Căutare</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Caută după nume, telefon, email, localitate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Clienți sub observație ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Nu există clienți sub observație
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stadiu ofertă</TableHead>
                    <TableHead>Data adăugării</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.nume}</div>
                        {client.localitate && (
                          <div className="text-sm text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {client.localitate}
                            {client.judet && `, ${client.judet}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <User className="h-3 w-3" />
                          {getAgentName(client.agentId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.telefon && (
                            <a
                              href={`tel:${client.telefon.replace(/\s+/g, "")}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                            >
                              <Phone className="h-3 w-3" />
                              {client.telefon}
                            </a>
                          )}
                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                            >
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getOfferStatusBadge(client.stadiuOferta || null)}
                      </TableCell>
                      <TableCell>
                        {client.dataAdaugare ? (
                          <span className="text-xs text-slate-400">
                            {format(new Date(client.dataAdaugare as any), "dd MMM yyyy", { locale: ro })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeObservationMutation.mutate(client.id)}
                          disabled={removeObservationMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
