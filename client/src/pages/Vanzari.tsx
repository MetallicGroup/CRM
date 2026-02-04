import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { 
  ShoppingCart, 
  TrendingUp,
  Calendar,
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Client {
  id: string;
  nume: string;
  telefon: string;
  email: string | null;
  judet: string | null;
  localitate: string | null;
  stadiuOferta: string | null;
  categorieProdus: string | null;
  valoareOferta: string | null;
  agentId: string | null;
  updatedAt: string;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  GARD_METALIC: "Gard Metalic",
  RULOU: "Rulou",
  PANOU_SANDWICH: "Panou Sandwich",
  TABLA_CUTATA: "Tablă Cutată",
  JGHEABURI: "Jgheaburi",
  ACCESORII: "Accesorii",
  COAMA: "Coamă",
  ALTELE: "Altele",
};

export default function Vanzari() {
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients", "won", isAdmin ? selectedAgent : user?.id],
    queryFn: async () => {
      const res = await fetch("/api/clients?stadiuOferta=VANDUT");
      if (!res.ok) throw new Error("Eroare la încărcarea vânzărilor");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin, // Only load agents list for admins
  });

  const filteredClients = clients.filter((client) => {
    const matchesSearch = search === "" || 
      client.nume.toLowerCase().includes(search.toLowerCase()) ||
      client.telefon.includes(search);
    
    // For non-admins, backend already filters by their agentId, so we don't need to filter by agent here
    // For admins, allow filtering by selected agent
    const matchesAgent = isAdmin 
      ? (selectedAgent === "all" || client.agentId === selectedAgent)
      : true; // Non-admins see only their own clients (already filtered by backend)
    const matchesCategory = selectedCategory === "all" || client.categorieProdus === selectedCategory;
    
    return matchesSearch && matchesAgent && matchesCategory;
  });

  const totalValue = filteredClients.reduce((sum, client) => {
    return sum + (client.valoareOferta ? parseFloat(client.valoareOferta) : 0);
  }, 0);

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Neasignat";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Necunoscut";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <ShoppingCart className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-title">Vânzări</h1>
            <p className="text-muted-foreground">
              Clienți câștigați și valoarea vânzărilor
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vânzări</p>
                <p className="text-2xl font-bold" data-testid="stat-total-vanzari">
                  {filteredClients.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valoare Totală</p>
                <p className="text-2xl font-bold" data-testid="stat-valoare-totala">
                  {totalValue.toLocaleString("ro-RO")} RON
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valoare Medie</p>
                <p className="text-2xl font-bold" data-testid="stat-valoare-medie">
                  {filteredClients.length > 0 
                    ? Math.round(totalValue / filteredClients.length).toLocaleString("ro-RO")
                    : 0} RON
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtrare Vânzări
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume sau telefon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            {isAdmin && (
              <div className="w-[200px]">
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger data-testid="select-agent">
                    <SelectValue placeholder="Toți agenții" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toți agenții</SelectItem>
                    {agents.filter(a => a.id).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-[150px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="GARD">Gard</SelectItem>
                  <SelectItem value="ACOPERIS">Acoperiș</SelectItem>
                  <SelectItem value="AMBELE">Ambele</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lista Vânzărilor ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există vânzări înregistrate</p>
              <Link href="/clienti">
                <Button variant="outline" className="mt-4">
                  Mergi la Clienți
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Valoare</TableHead>
                  {isAdmin && <TableHead>Agent</TableHead>}
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-sale-${client.id}`}>
                    <TableCell className="font-medium">
                      {client.nume}
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
                          <a
                            href={`mailto:${client.email}`}
                            className="flex items-center gap-1 text-muted-foreground hover:underline"
                          >
                            <Mail className="h-3 w-3" /> {client.email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.judet && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {client.judet}
                          {client.localitate && `, ${client.localitate}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {client.categorieProdus ? (CATEGORY_LABELS[client.categorieProdus] || client.categorieProdus) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {client.valoareOferta 
                        ? `${parseFloat(client.valoareOferta).toLocaleString("ro-RO")} RON`
                        : "-"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {getAgentName(client.agentId)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {format(new Date(client.updatedAt), "d MMM yyyy", { locale: ro })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
