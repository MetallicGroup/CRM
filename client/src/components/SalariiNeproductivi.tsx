import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Download, Upload, Loader2, Users, Factory, Building } from "lucide-react";
import { format } from "date-fns";

interface SalariuNeproductiv {
  id: string;
  numeAngajat: string;
  tipAngajat: string;
  luna: number;
  an: number;
  salariuBrut: string | null;
  salariuNet: string | null;
  bonusuri: string | null;
  alteCosturi: string | null;
  totalCost: string | null;
  descriere: string | null;
  documentUrl: string | null;
  createdAt: string;
}

interface SalariiTotals {
  totalProductie: number;
  totalIndirect: number;
  totalGeneral: number;
  byAngajat: Record<string, number>;
}

interface Props {
  luna: number;
  an: number;
}

const MONTHS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export function SalariiNeproductivi({ luna, an }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalariuNeproductiv | null>(null);
  const [deleteItem, setDeleteItem] = useState<SalariuNeproductiv | null>(null);
  const [tipFilter, setTipFilter] = useState<string>("all");
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState({
    numeAngajat: "",
    tipAngajat: "PRODUCTIE" as "PRODUCTIE" | "INDIRECT",
    salariuBrut: "",
    salariuNet: "",
    bonusuri: "",
    alteCosturi: "",
    descriere: "",
    documentUrl: ""
  });

  const { data: salarii = [], isLoading } = useQuery<SalariuNeproductiv[]>({
    queryKey: ["/api/salarii-neproductivi", luna, an, tipFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("luna", luna.toString());
      params.set("an", an.toString());
      if (tipFilter !== "all") params.set("tipAngajat", tipFilter);
      const res = await fetch(`/api/salarii-neproductivi?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const { data: totals } = useQuery<SalariiTotals>({
    queryKey: ["/api/salarii-neproductivi/totals", luna, an],
    queryFn: async () => {
      const res = await fetch(`/api/salarii-neproductivi/totals?luna=${luna}&an=${an}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { luna: number; an: number }) => {
      const res = await fetch("/api/salarii-neproductivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salarii-neproductivi"] });
      toast.success("Salariu adăugat cu succes");
      handleCloseDialog();
    },
    onError: () => toast.error("Eroare la salvare")
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/salarii-neproductivi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salarii-neproductivi"] });
      toast.success("Salariu actualizat cu succes");
      handleCloseDialog();
    },
    onError: () => toast.error("Eroare la actualizare")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/salarii-neproductivi/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salarii-neproductivi"] });
      toast.success("Salariu șters");
      setDeleteItem(null);
    },
    onError: () => toast.error("Eroare la ștergere")
  });

  const handleOpenDialog = (item?: SalariuNeproductiv) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        numeAngajat: item.numeAngajat,
        tipAngajat: item.tipAngajat as "PRODUCTIE" | "INDIRECT",
        salariuBrut: item.salariuBrut || "",
        salariuNet: item.salariuNet || "",
        bonusuri: item.bonusuri || "",
        alteCosturi: item.alteCosturi || "",
        descriere: item.descriere || "",
        documentUrl: item.documentUrl || ""
      });
    } else {
      setEditingItem(null);
      setFormData({
        numeAngajat: "",
        tipAngajat: "PRODUCTIE",
        salariuBrut: "",
        salariuNet: "",
        bonusuri: "",
        alteCosturi: "",
        descriere: "",
        documentUrl: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, luna, an });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "salarii");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: uploadFormData
      });

      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, documentUrl: data.url }));
      toast.success("Fișier încărcat");
    } catch (error) {
      toast.error("Eroare la încărcare");
    } finally {
      setUploadingFile(false);
    }
  };

  const productieCount = salarii.filter(s => s.tipAngajat === "PRODUCTIE").length;
  const indirectCount = salarii.filter(s => s.tipAngajat === "INDIRECT").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Producție</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">
                {(totals?.totalProductie || 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{productieCount} angajați</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Indirect/HQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold text-purple-600">
                {(totals?.totalIndirect || 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{indirectCount} angajați</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {(totals?.totalGeneral || 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{salarii.length} total angajați</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Salarii {MONTHS[luna - 1]} {an}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Select value={tipFilter} onValueChange={setTipFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-tip-filter">
                <SelectValue placeholder="Toate tipurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="PRODUCTIE">Producție</SelectItem>
                <SelectItem value="INDIRECT">Indirect/HQ</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-salariu">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă salariu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Se încarcă...</p>
          ) : salarii.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nu există salarii înregistrate pentru {MONTHS[luna - 1]} {an}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume Angajat</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="text-right">Salariu Brut</TableHead>
                  <TableHead className="text-right">Bonusuri</TableHead>
                  <TableHead className="text-right">Alte Costuri</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Doc</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarii.map((s) => (
                  <TableRow key={s.id} data-testid={`row-salariu-${s.id}`}>
                    <TableCell className="font-medium">{s.numeAngajat}</TableCell>
                    <TableCell>
                      <Badge variant={s.tipAngajat === "PRODUCTIE" ? "default" : "secondary"}>
                        {s.tipAngajat === "PRODUCTIE" ? "Producție" : "Indirect/HQ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(s.salariuBrut || "0").toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(s.bonusuri || "0").toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(s.alteCosturi || "0").toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {parseFloat(s.totalCost || "0").toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {s.documentUrl ? (
                        <a 
                          href={s.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          title="Descarcă document"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(s)}
                          data-testid={`button-edit-salariu-${s.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteItem(s)}
                          data-testid={`button-delete-salariu-${s.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editare Salariu" : "Adăugare Salariu"}
            </DialogTitle>
            <DialogDescription>
              Înregistrare salariu pentru {MONTHS[luna - 1]} {an}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numeAngajat">Nume Angajat *</Label>
              <Input
                id="numeAngajat"
                value={formData.numeAngajat}
                onChange={(e) => setFormData({ ...formData, numeAngajat: e.target.value })}
                placeholder="Ex: Ion Popescu"
                required
                data-testid="input-nume-angajat"
              />
            </div>

            <div className="space-y-2">
              <Label>Tip Angajat *</Label>
              <Select
                value={formData.tipAngajat}
                onValueChange={(val) => setFormData({ ...formData, tipAngajat: val as "PRODUCTIE" | "INDIRECT" })}
              >
                <SelectTrigger data-testid="select-tip-angajat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTIE">Producție</SelectItem>
                  <SelectItem value="INDIRECT">Indirect/HQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salariuBrut">Salariu Brut (LEI)</Label>
                <Input
                  id="salariuBrut"
                  type="number"
                  step="0.01"
                  value={formData.salariuBrut}
                  onChange={(e) => setFormData({ ...formData, salariuBrut: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-salariu-brut"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salariuNet">Salariu Net (LEI)</Label>
                <Input
                  id="salariuNet"
                  type="number"
                  step="0.01"
                  value={formData.salariuNet}
                  onChange={(e) => setFormData({ ...formData, salariuNet: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-salariu-net"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bonusuri">Bonusuri (LEI)</Label>
                <Input
                  id="bonusuri"
                  type="number"
                  step="0.01"
                  value={formData.bonusuri}
                  onChange={(e) => setFormData({ ...formData, bonusuri: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-bonusuri"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alteCosturi">Alte Costuri (LEI)</Label>
                <Input
                  id="alteCosturi"
                  type="number"
                  step="0.01"
                  value={formData.alteCosturi}
                  onChange={(e) => setFormData({ ...formData, alteCosturi: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-alte-costuri"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriere">Descriere / Notă</Label>
              <Textarea
                id="descriere"
                value={formData.descriere}
                onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
                placeholder="Detalii suplimentare..."
                data-testid="input-descriere"
              />
            </div>

            <div className="space-y-2">
              <Label>Document atașat</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  data-testid="input-document"
                />
                {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {formData.documentUrl && (
                <p className="text-xs text-green-600">Document atașat ✓</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Anulează
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-salariu"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Salvează" : "Adaugă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur doriți să ștergeți înregistrarea salariului pentru <strong>{deleteItem?.numeAngajat}</strong>?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
