import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2, 
  Users,
  Filter,
  RefreshCw,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Client, CreateClient, ClientStatus, ClientSource, ProductCategory } from "@shared/schema";

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string }[] = [
  { value: "NOU", label: "Nou", color: "bg-blue-100 text-blue-800" },
  { value: "CONTACTAT", label: "Contactat", color: "bg-yellow-100 text-yellow-800" },
  { value: "OFERTA_TRIMISA", label: "Ofertă trimisă", color: "bg-purple-100 text-purple-800" },
  { value: "NEGOCIERE", label: "Negociere", color: "bg-orange-100 text-orange-800" },
  { value: "CASTIGAT", label: "Câștigat", color: "bg-green-100 text-green-800" },
  { value: "PIERDUT", label: "Pierdut", color: "bg-red-100 text-red-800" },
  { value: "ANULAT", label: "Anulat", color: "bg-gray-100 text-gray-800" },
];

const SOURCE_OPTIONS: { value: ClientSource; label: string }[] = [
  { value: "TELEFON", label: "Telefon" },
  { value: "EMAIL", label: "Email" },
  { value: "WEBSITE", label: "Website" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "RECOMANDARE", label: "Recomandare" },
  { value: "SHOWROOM", label: "Showroom" },
  { value: "ALTELE", label: "Altele" },
];

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "GARD", label: "Gard" },
  { value: "ACOPERIS", label: "Acoperiș" },
  { value: "AMBELE", label: "Ambele" },
];

const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", 
  "Brașov", "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași", 
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", 
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", 
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", 
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
];

function getStatusBadge(status: ClientStatus) {
  const option = STATUS_OPTIONS.find(s => s.value === status);
  return (
    <Badge className={cn("font-medium", option?.color)}>
      {option?.label || status}
    </Badge>
  );
}

export default function Clienti() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateClient>>({
    nume: "",
    prenume: "",
    telefon: "",
    telefonSecundar: "",
    email: "",
    judet: "",
    localitate: "",
    adresa: "",
    status: "NOU",
    sursa: "TELEFON",
    categorie: "GARD",
    valoareEstimata: "",
    note: "",
  });

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea clienților");
      return res.json();
    },
  });

  // Fetch agents for assignment
  const { data: agents = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateClient) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la creare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client creat cu succes");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClient> }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la actualizare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client actualizat cu succes");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la ștergere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client șters cu succes");
      setDeleteClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormData({
      nume: "",
      prenume: "",
      telefon: "",
      telefonSecundar: "",
      email: "",
      judet: "",
      localitate: "",
      adresa: "",
      status: "NOU",
      sursa: "TELEFON",
      categorie: "GARD",
      valoareEstimata: "",
      note: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nume: client.nume,
      prenume: client.prenume || "",
      telefon: client.telefon,
      telefonSecundar: client.telefonSecundar || "",
      email: client.email || "",
      judet: client.judet || "",
      localitate: client.localitate || "",
      adresa: client.adresa || "",
      status: client.status,
      sursa: client.sursa,
      categorie: client.categorie,
      valoareEstimata: client.valoareEstimata || "",
      note: client.note || "",
      agentId: client.agentId || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nume || !formData.telefon) {
      toast.error("Numele și telefonul sunt obligatorii");
      return;
    }

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData as CreateClient });
    } else {
      createMutation.mutate(formData as CreateClient);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Clienți</h1>
            <p className="text-muted-foreground">
              Gestionează baza de date cu clienți
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-client">
          <Plus className="h-4 w-4" />
          Adaugă Client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Filtre</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Resetează
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume, telefon, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-clients"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Toate statusurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Niciun client găsit</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "all" 
                  ? "Modifică filtrele pentru a vedea mai mulți clienți"
                  : "Adaugă primul client pentru a începe"}
              </p>
              {!search && statusFilter === "all" && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adaugă Client
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Valoare</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {client.nume} {client.prenume}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {SOURCE_OPTIONS.find(s => s.value === client.sursa)?.label}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          {client.telefon}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.judet || client.localitate ? (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3" />
                          {[client.localitate, client.judet].filter(Boolean).join(", ")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_OPTIONS.find(c => c.value === client.categorie)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.valoareEstimata ? (
                        <span className="font-medium">
                          {Number(client.valoareEstimata).toLocaleString("ro-RO")} RON
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewClient(client)}
                          data-testid={`button-view-${client.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(client)}
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteClient(client)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${client.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editează Client" : "Adaugă Client Nou"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Modifică datele clientului" : "Completează datele noului client"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Informații Contact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nume">Nume *</Label>
                  <Input
                    id="nume"
                    value={formData.nume}
                    onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                    required
                    data-testid="input-nume"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenume">Prenume</Label>
                  <Input
                    id="prenume"
                    value={formData.prenume}
                    onChange={(e) => setFormData({ ...formData, prenume: e.target.value })}
                    data-testid="input-prenume"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefon">Telefon *</Label>
                  <Input
                    id="telefon"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    required
                    data-testid="input-telefon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefonSecundar">Telefon Secundar</Label>
                  <Input
                    id="telefonSecundar"
                    value={formData.telefonSecundar}
                    onChange={(e) => setFormData({ ...formData, telefonSecundar: e.target.value })}
                    data-testid="input-telefon-secundar"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Locație
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="judet">Județ</Label>
                  <Select
                    value={formData.judet}
                    onValueChange={(value) => setFormData({ ...formData, judet: value })}
                  >
                    <SelectTrigger data-testid="select-judet">
                      <SelectValue placeholder="Selectează județul" />
                    </SelectTrigger>
                    <SelectContent>
                      {JUDETE.map((judet) => (
                        <SelectItem key={judet} value={judet}>
                          {judet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localitate">Localitate</Label>
                  <Input
                    id="localitate"
                    value={formData.localitate}
                    onChange={(e) => setFormData({ ...formData, localitate: e.target.value })}
                    data-testid="input-localitate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresa">Adresă</Label>
                <Input
                  id="adresa"
                  value={formData.adresa}
                  onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                  data-testid="input-adresa"
                />
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Informații Afacere
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as ClientStatus })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sursa">Sursă</Label>
                  <Select
                    value={formData.sursa}
                    onValueChange={(value) => setFormData({ ...formData, sursa: value as ClientSource })}
                  >
                    <SelectTrigger data-testid="select-sursa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categorie">Categorie</Label>
                  <Select
                    value={formData.categorie}
                    onValueChange={(value) => setFormData({ ...formData, categorie: value as ProductCategory })}
                  >
                    <SelectTrigger data-testid="select-categorie">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valoareEstimata">Valoare Estimată (RON)</Label>
                  <Input
                    id="valoareEstimata"
                    type="number"
                    value={formData.valoareEstimata}
                    onChange={(e) => setFormData({ ...formData, valoareEstimata: e.target.value })}
                    data-testid="input-valoare"
                  />
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent Responsabil</Label>
                    <Select
                      value={formData.agentId || ""}
                      onValueChange={(value) => setFormData({ ...formData, agentId: value || undefined })}
                    >
                      <SelectTrigger data-testid="select-agent">
                        <SelectValue placeholder="Selectează agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Neasignat</SelectItem>
                        {agents.filter((a: any) => a.active).map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.firstName} {agent.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                data-testid="input-note"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Anulează
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-client"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Se salvează..."
                  : editingClient
                  ? "Salvează"
                  : "Adaugă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalii Client</DialogTitle>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {viewClient.nume} {viewClient.prenume}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Adăugat {format(new Date(viewClient.createdAt), "d MMMM yyyy", { locale: ro })}
                  </p>
                </div>
                {getStatusBadge(viewClient.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Telefon</p>
                  <p className="font-medium">{viewClient.telefon}</p>
                </div>
                {viewClient.telefonSecundar && (
                  <div>
                    <p className="text-muted-foreground">Telefon Secundar</p>
                    <p className="font-medium">{viewClient.telefonSecundar}</p>
                  </div>
                )}
                {viewClient.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{viewClient.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Sursă</p>
                  <p className="font-medium">
                    {SOURCE_OPTIONS.find(s => s.value === viewClient.sursa)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categorie</p>
                  <p className="font-medium">
                    {CATEGORY_OPTIONS.find(c => c.value === viewClient.categorie)?.label}
                  </p>
                </div>
                {viewClient.valoareEstimata && (
                  <div>
                    <p className="text-muted-foreground">Valoare Estimată</p>
                    <p className="font-medium">
                      {Number(viewClient.valoareEstimata).toLocaleString("ro-RO")} RON
                    </p>
                  </div>
                )}
              </div>

              {(viewClient.judet || viewClient.localitate || viewClient.adresa) && (
                <div>
                  <p className="text-muted-foreground text-sm">Locație</p>
                  <p className="font-medium">
                    {[viewClient.adresa, viewClient.localitate, viewClient.judet].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              {viewClient.note && (
                <div>
                  <p className="text-muted-foreground text-sm">Note</p>
                  <p className="text-sm whitespace-pre-wrap">{viewClient.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge Client</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi clientul "{deleteClient?.nume} {deleteClient?.prenume}"? 
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClient && deleteMutation.mutate(deleteClient.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
