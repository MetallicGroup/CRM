import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { 
  Handshake, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2,
  Building2,
  User,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Partner {
  id: string;
  nume: string;
  tipPartener: string;
  cui: string | null;
  telefon: string | null;
  email: string | null;
  adresa: string | null;
  persoanaContact: string | null;
  note: string | null;
  activ: boolean;
}

const PARTNER_TYPES: { value: string; label: string; color: string }[] = [
  { value: "FURNIZOR", label: "Furnizor", color: "bg-blue-100 text-blue-800" },
  { value: "SUBCONTRACTOR", label: "Subcontractor", color: "bg-purple-100 text-purple-800" },
  { value: "COLABORATOR", label: "Colaborator", color: "bg-green-100 text-green-800" },
  { value: "DISTRIBUITOR", label: "Distribuitor", color: "bg-orange-100 text-orange-800" },
];

export default function Parteneri() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletePartner, setDeletePartner] = useState<Partner | null>(null);

  const [formData, setFormData] = useState({
    nume: "",
    tipPartener: "FURNIZOR",
    cui: "",
    telefon: "",
    email: "",
    adresa: "",
    persoanaContact: "",
    note: "",
    activ: true,
  });

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["partners"],
    queryFn: async () => {
      const res = await fetch("/api/partners");
      if (!res.ok) throw new Error("Eroare la încărcarea partenerilor");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partener creat cu succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partener actualizat cu succes");
      setIsDialogOpen(false);
      setEditingPartner(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partener șters cu succes");
      setDeletePartner(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch = search === "" ||
      partner.nume.toLowerCase().includes(search.toLowerCase()) ||
      partner.cui?.toLowerCase().includes(search.toLowerCase()) ||
      partner.persoanaContact?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || partner.tipPartener === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && partner.activ) ||
      (statusFilter === "inactive" && !partner.activ);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      nume: "",
      tipPartener: "FURNIZOR",
      cui: "",
      telefon: "",
      email: "",
      adresa: "",
      persoanaContact: "",
      note: "",
      // Agenții creează parteneri neaprobați (inactivi)
      activ: isAdmin,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingPartner(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setFormData({
      nume: partner.nume,
      tipPartener: partner.tipPartener,
      cui: partner.cui || "",
      telefon: partner.telefon || "",
      email: partner.email || "",
      adresa: partner.adresa || "",
      persoanaContact: partner.persoanaContact || "",
      note: partner.note || "",
      activ: partner.activ,
    });
    setEditingPartner(partner);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nume) {
      toast.error("Numele este obligatoriu");
      return;
    }

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTypeBadge = (type: string) => {
    const option = PARTNER_TYPES.find(t => t.value === type);
    return (
      <Badge className={cn("font-medium", option?.color)}>
        {option?.label || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Handshake className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-title">Parteneri</h1>
            <p className="text-muted-foreground">
              Gestionează furnizorii, subcontractorii și colaboratorii
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              {partners.some(p => !p.activ) && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                  Parteneri de aprobat:{" "}
                  {partners.filter(p => !p.activ).length}
                </Badge>
              )}
            </div>
          )}
          <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-partner">
            <Plus className="h-4 w-4" />
            {isAdmin ? "Adaugă Partener" : "Propune Partener"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {PARTNER_TYPES.map((type) => {
          const count = partners.filter(p => p.tipPartener === type.value && p.activ).length;
          return (
            <Card key={type.value}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{type.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Badge className={cn("text-lg px-3 py-1", type.color)}>
                    {type.label.charAt(0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtrare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume, CUI sau persoană contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Tip partener" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate tipurile</SelectItem>
                  {PARTNER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="active">Activi</SelectItem>
                  <SelectItem value="inactive">Inactivi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Lista Partenerilor ({filteredPartners.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există parteneri înregistrați</p>
              {isAdmin && (
                <Button variant="outline" onClick={openCreateDialog} className="mt-4">
                  Adaugă primul partener
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>CUI</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Acțiuni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{partner.nume}</p>
                        {partner.persoanaContact && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> {partner.persoanaContact}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(partner.tipPartener)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {partner.telefon && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {partner.telefon}
                          </span>
                        )}
                        {partner.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {partner.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {partner.cui && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {partner.cui}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.activ ? "default" : "secondary"}>
                        {partner.activ ? "Activ" : "Inactiv"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(partner)}
                            data-testid={`button-edit-${partner.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletePartner(partner)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${partner.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? "Editează Partener" : "Adaugă Partener Nou"}
            </DialogTitle>
            <DialogDescription>
              Completează informațiile despre partener
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nume *</Label>
                <Input
                  value={formData.nume}
                  onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                  placeholder="Nume companie"
                  data-testid="input-nume"
                />
              </div>
              <div className="space-y-2">
                <Label>Tip Partener</Label>
                <Select value={formData.tipPartener} onValueChange={(v) => setFormData({ ...formData, tipPartener: v })}>
                  <SelectTrigger data-testid="select-tip-partener">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CUI</Label>
                <Input
                  value={formData.cui}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  placeholder="ex: RO12345678"
                  data-testid="input-cui"
                />
              </div>
              <div className="space-y-2">
                <Label>Persoană Contact</Label>
                <Input
                  value={formData.persoanaContact}
                  onChange={(e) => setFormData({ ...formData, persoanaContact: e.target.value })}
                  placeholder="Nume persoană"
                  data-testid="input-persoana-contact"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  placeholder="07xx xxx xxx"
                  data-testid="input-telefon"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@companie.ro"
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresa</Label>
              <Input
                value={formData.adresa}
                onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                placeholder="Adresa completă"
                data-testid="input-adresa"
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Observații, detalii suplimentare..."
                rows={3}
                data-testid="input-note"
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.activ}
                  onCheckedChange={(checked) => setFormData({ ...formData, activ: checked })}
                  data-testid="switch-activ"
                />
                <Label>Partener activ</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmit} data-testid="button-save-partner">
              {editingPartner ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePartner} onOpenChange={() => setDeletePartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va șterge partenerul "{deletePartner?.nume}".
              Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePartner && deleteMutation.mutate(deletePartner.id)}
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
