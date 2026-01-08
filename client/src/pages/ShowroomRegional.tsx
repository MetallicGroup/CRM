import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { MONTHS } from "@/lib/types";
import { useFinancialReport } from "@/hooks/use-financials";

interface ShowroomCosts {
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
}

interface CheltuialaSediu {
  id: string;
  sediuId: string;
  categoryId: string;
  subcategoryId: string;
  suma: string;
  descriere: string | null;
  dataCheltuiala: string;
  luna: number;
  an: number;
  firma: string | null;
}

interface CheltuialaAgent {
  id: string;
  agentId: string;
  sediuId: string;
  categoryId: string;
  subcategoryId: string;
  suma: string;
  descriere: string | null;
  dataCheltuiala: string;
  luna: number;
  an: number;
  firma: string | null;
}

interface Sediu {
  id: string;
  nume: string;
  judet: string;
}

const SHOWROOM_EXPENSE_TYPES = [
  { id: "chirie", name: "Chirie / Cota parte showroom", categoryId: "cat-generale", subcategoryId: "c3b11246-7867-40f5-ba0b-511dad776321" },
  { id: "utilitati", name: "Utilități (curent, gaz, apă)", categoryId: "cat-generale", subcategoryId: "sub-alte", keywords: "utilit" },
  { id: "marketing", name: "Marketing / Publicitate", categoryId: "cat-generale", subcategoryId: "eb6d1178-49ee-43ee-8d27-3c704182cb0f" },
  { id: "consumabile", name: "Consumabile / Materiale", categoryId: "cat-generale", subcategoryId: "sub-materiale" },
  { id: "investitii", name: "Investiții / Amenajări showroom", categoryId: "cat-generale", subcategoryId: "aec333c7-bb7a-4854-b029-7cd83be18a3a" },
  { id: "alte", name: "Alte cheltuieli showroom", categoryId: "cat-generale", subcategoryId: "sub-alte" },
];

export default function ShowroomRegional() {
  const { selectedMonth } = useStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const lunaNumar = useMemo(() => {
    return MONTHS.indexOf(selectedMonth) + 1;
  }, [selectedMonth]);
  const [selectedShowroomId, setSelectedShowroomId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CheltuialaSediu | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<CheltuialaSediu | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    expenseType: "",
    suma: "",
    descriere: "",
    dataCheltuiala: format(new Date(), "yyyy-MM-dd"),
    firma: "METALLIC GROUP SRL",
  });

  const { data: sedii = [] } = useQuery<Sediu[]>({
    queryKey: ["sedii"],
    queryFn: async () => {
      const res = await fetch("/api/sedii");
      if (!res.ok) throw new Error("Eroare la încărcarea sediilor");
      return res.json();
    },
  });

  useEffect(() => {
    if (sedii.length > 0 && !selectedShowroomId) {
      setSelectedShowroomId(sedii[0].id);
    }
  }, [sedii, selectedShowroomId]);

  const { data: report, isLoading: loadingReport } = useFinancialReport(
    lunaNumar,
    selectedYear
  );

  const showroomCosts = useMemo(() => {
    if (!report?.showroomTotals) return {};
    const map: Record<string, any> = {};
    report.showroomTotals.forEach((s: any) => {
      map[s.id] = s;
    });
    return map;
  }, [report]);

  const { data: cheltuieliSediu = [], isLoading: loadingCheltuieli } = useQuery<CheltuialaSediu[]>({
    queryKey: ["cheltuieli-sediu-showroom", selectedShowroomId, lunaNumar, selectedYear],
    queryFn: async () => {
      if (!selectedShowroomId) return [];
      const res = await fetch(`/api/cheltuieli-sediu?sediuId=${selectedShowroomId}&luna=${lunaNumar}&an=${selectedYear}`);
      if (!res.ok) throw new Error("Eroare la încărcarea cheltuielilor");
      return res.json();
    },
    enabled: !!selectedShowroomId,
  });

  const { data: cheltuieliAgenti = [] } = useQuery<CheltuialaAgent[]>({
    queryKey: ["cheltuieli-agent-showroom", selectedShowroomId, lunaNumar, selectedYear],
    queryFn: async () => {
      if (!selectedShowroomId) return [];
      const res = await fetch(`/api/cheltuieli-agent?sediuId=${selectedShowroomId}&luna=${lunaNumar}&an=${selectedYear}`);
      if (!res.ok) throw new Error("Eroare la încărcarea cheltuielilor agenți");
      return res.json();
    },
    enabled: !!selectedShowroomId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/cheltuieli-sediu", {
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
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-showroom"] });
      queryClient.invalidateQueries({ queryKey: ["showroom-costs"] });
      toast.success("Cheltuială adăugată cu succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/cheltuieli-sediu/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-showroom"] });
      queryClient.invalidateQueries({ queryKey: ["showroom-costs"] });
      toast.success("Cheltuială actualizată cu succes");
      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cheltuieli-sediu/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-showroom"] });
      queryClient.invalidateQueries({ queryKey: ["showroom-costs"] });
      toast.success("Cheltuială ștearsă cu succes");
      setDeleteExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      expenseType: "",
      suma: "",
      descriere: "",
      dataCheltuiala: format(new Date(), "yyyy-MM-dd"),
      firma: "METALLIC GROUP SRL",
    });
  };

  const handleOpenDialog = (expense?: CheltuialaSediu) => {
    if (expense) {
      setEditingExpense(expense);
      const expType = SHOWROOM_EXPENSE_TYPES.find(t =>
        t.categoryId === expense.categoryId && t.subcategoryId === expense.subcategoryId
      );
      setFormData({
        expenseType: expType?.id || "",
        suma: expense.suma,
        descriere: expense.descriere || "",
        dataCheltuiala: format(new Date(expense.dataCheltuiala), "yyyy-MM-dd"),
        firma: expense.firma || "METALLIC GROUP SRL",
      });
    } else {
      resetForm();
      setEditingExpense(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expenseType = SHOWROOM_EXPENSE_TYPES.find(t => t.id === formData.expenseType);
    if (!expenseType || !selectedShowroomId) return;

    const date = new Date(formData.dataCheltuiala);
    const payload = {
      sediuId: selectedShowroomId,
      categoryId: expenseType.categoryId,
      subcategoryId: expenseType.subcategoryId,
      suma: formData.suma,
      descriere: formData.descriere || expenseType.name,
      dataCheltuiala: formData.dataCheltuiala,
      luna: date.getMonth() + 1,
      an: date.getFullYear(),
      firma: formData.firma,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getExpenseTypeName = (categoryId: string, subcategoryId: string) => {
    const expType = SHOWROOM_EXPENSE_TYPES.find(t =>
      t.categoryId === categoryId && t.subcategoryId === subcategoryId
    );
    return expType?.name || "Altele";
  };

  const showrooms = useMemo(() => {
    return Object.entries(showroomCosts).map(([id, data]: [string, any]) => ({
      id,
      name: data.name,
      costs: data,
    }));
  }, [showroomCosts]);

  const allShowrooms = sedii.map(s => {
    const existing = showrooms.find(sh => sh.id === s.id);
    return existing || {
      id: s.id,
      name: s.nume,
      costs: {
        sediuName: s.nume,
        chirie: 0, utilitati: 0, marketing: 0, consumabile: 0, investitii: 0, alte: 0,
        total: 0, cheltuieliAgenti: 0, salarii: 0, combustibil: 0, auto: 0,
      },
    };
  });

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Showroom-uri</h1>
          <p className="text-muted-foreground">Cheltuieli pe locație - Luna {selectedMonth}/{selectedYear}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-year">
              <SelectValue placeholder="An" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MonthSelector />
        </div>
      </div>

      {allShowrooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nu există showroom-uri configurate.
          </CardContent>
        </Card>
      ) : (
        <Tabs
          defaultValue={allShowrooms[0]?.id}
          value={selectedShowroomId || allShowrooms[0]?.id}
          onValueChange={setSelectedShowroomId}
        >
          <TabsList className="flex-wrap">
            {allShowrooms.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {s.name}
                {s.costs.total > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {s.costs.total.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {allShowrooms.map(showroom => {
            const costs = showroom.costs;
            const isBucuresti = showroom.name.toLowerCase().includes('bucurești');
            const cheltuieliShowroom = costs.chirie + costs.utilitati + costs.marketing + costs.consumabile + (costs.investitii || 0) + costs.alte;
            const costShowroomDistribuit = isBucuresti ? cheltuieliShowroom * 0.20 : cheltuieliShowroom;
            const costShowroomIndirect = isBucuresti ? cheltuieliShowroom * 0.80 : 0;
            const totalDistribuitAgenti = costShowroomDistribuit + (costs.cheltuieliAgenti || 0);

            return (
              <TabsContent key={showroom.id} value={showroom.id} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Cheltuieli {showroom.name}</CardTitle>
                      <Button onClick={() => handleOpenDialog()} data-testid="btn-add-expense">
                        <Plus className="h-4 w-4 mr-2" />
                        Adaugă Cheltuială
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tip Cheltuială</TableHead>
                            <TableHead className="text-right">Valoare (RON)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-blue-50/50">
                            <TableCell colSpan={2} className="font-semibold text-blue-700">
                              Cheltuieli Showroom
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Chirii / Cota parte</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.chirie.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Utilități</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.utilitati.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Marketing</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.marketing.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Consumabile / Materiale</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.consumabile.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Investiții / Amenajări</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.investitii || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Alte cheltuieli showroom</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.alte.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-100/50">
                            <TableCell className="font-semibold">Subtotal Showroom</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {cheltuieliShowroom.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>

                          <TableRow className="bg-green-50/50">
                            <TableCell colSpan={2} className="font-semibold text-green-700">
                              Cheltuieli Agenți
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Salarii / Comisioane</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.salarii || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Combustibil</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.combustibil || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Auto (Leasing, Asigurări, Revizii)</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.auto || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Alte cheltuieli agenți</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.alteCheltuieliAgenti || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-green-100/50">
                            <TableCell className="font-semibold">Subtotal Agenți</TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                              {(costs.cheltuieliAgenti || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>

                          <TableRow className="bg-primary/10 font-bold">
                            <TableCell className="text-lg">TOTAL CHELTUIELI</TableCell>
                            <TableCell className="text-right text-lg text-primary">
                              {costs.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sumar {showroom.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cost Total Luna {selectedMonth}</p>
                        <div className="text-3xl font-bold text-primary" data-testid={`text-total-${showroom.id}`}>
                          {costs.total.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm border-t pt-4">
                        <div>
                          <span className="text-muted-foreground">Showroom:</span>
                          <div className="font-bold text-blue-600">
                            {cheltuieliShowroom.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agenți:</span>
                          <div className="font-bold text-green-600">
                            {(costs.cheltuieliAgenti || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                          </div>
                        </div>
                      </div>

                      {isBucuresti && cheltuieliShowroom > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-xs text-muted-foreground font-medium">Distribuție Cheltuieli Showroom (București):</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">20% → Agenți:</span>
                            <span className="font-bold text-blue-600">{costShowroomDistribuit.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">80% → Indirecte:</span>
                            <span className="font-bold text-purple-600">{costShowroomIndirect.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-2 mt-2">
                            <span className="text-sm font-medium">Total → Agenți:</span>
                            <span className="font-bold text-emerald-600">{totalDistribuitAgenti.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                        </div>
                      )}

                      {!isBucuresti && costs.total > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm text-muted-foreground">100% cheltuieli showroom se distribuie agenților.</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total → Agenți:</span>
                            <span className="font-bold text-emerald-600">{totalDistribuitAgenti.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                        </div>
                      )}

                      {costs.total === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nu există cheltuieli înregistrate pentru această lună.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Istoric Cheltuieli - Luna {selectedMonth}/{selectedYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingCheltuieli ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : cheltuieliSediu.length === 0 && cheltuieliAgenti.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        Nu există cheltuieli înregistrate pentru această lună.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {cheltuieliSediu.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Cheltuieli Showroom ({cheltuieliSediu.length})
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Tip</TableHead>
                                  <TableHead>Descriere</TableHead>
                                  <TableHead>Firmă</TableHead>
                                  <TableHead className="text-right">Suma (RON)</TableHead>
                                  <TableHead className="text-right">Acțiuni</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cheltuieliSediu.map((c) => (
                                  <TableRow key={c.id} data-testid={`row-expense-${c.id}`}>
                                    <TableCell>{format(new Date(c.dataCheltuiala), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-blue-50">
                                        {getExpenseTypeName(c.categoryId, c.subcategoryId)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{c.descriere || "-"}</TableCell>
                                    <TableCell>{c.firma || "-"}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {parseFloat(c.suma).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenDialog(c)}
                                          data-testid={`btn-edit-${c.id}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteExpense(c)}
                                          data-testid={`btn-delete-${c.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {cheltuieliAgenti.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                              <span className="h-4 w-4">👤</span>
                              Cheltuieli Agenți ({cheltuieliAgenti.length})
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Tip</TableHead>
                                  <TableHead>Descriere</TableHead>
                                  <TableHead>Firmă</TableHead>
                                  <TableHead className="text-right">Suma (RON)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cheltuieliAgenti.map((c) => (
                                  <TableRow key={c.id} data-testid={`row-agent-expense-${c.id}`}>
                                    <TableCell>{format(new Date(c.dataCheltuiala), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-green-50">
                                        Agent
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{c.descriere || "-"}</TableCell>
                                    <TableCell>{c.firma || "-"}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {parseFloat(c.suma).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Editează Cheltuială" : "Adaugă Cheltuială Showroom"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tip Cheltuială *</Label>
              <Select
                value={formData.expenseType}
                onValueChange={(val) => setFormData({ ...formData, expenseType: val })}
              >
                <SelectTrigger data-testid="select-expense-type">
                  <SelectValue placeholder="Selectează tipul" />
                </SelectTrigger>
                <SelectContent>
                  {SHOWROOM_EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suma">Suma (RON) *</Label>
                <Input
                  id="suma"
                  type="number"
                  step="0.01"
                  value={formData.suma}
                  onChange={(e) => setFormData({ ...formData, suma: e.target.value })}
                  required
                  data-testid="input-suma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataCheltuiala">Data *</Label>
                <Input
                  id="dataCheltuiala"
                  type="date"
                  value={formData.dataCheltuiala}
                  onChange={(e) => setFormData({ ...formData, dataCheltuiala: e.target.value })}
                  required
                  data-testid="input-data"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriere">Descriere (opțional)</Label>
              <Input
                id="descriere"
                value={formData.descriere}
                onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
                placeholder="Ex: Chirie decembrie 2025"
                data-testid="input-descriere"
              />
            </div>

            <div className="space-y-2">
              <Label>Firmă</Label>
              <Select
                value={formData.firma}
                onValueChange={(val) => setFormData({ ...formData, firma: val })}
              >
                <SelectTrigger data-testid="select-firma">
                  <SelectValue placeholder="Selectează firma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="METALLIC GROUP SRL">METALLIC GROUP SRL</SelectItem>
                  <SelectItem value="MM ROOF INTERMED SRL">MM ROOF INTERMED SRL</SelectItem>
                  <SelectItem value="ROOFERS RO">ROOFERS RO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={!formData.expenseType || !formData.suma || createMutation.isPending || updateMutation.isPending}
                data-testid="btn-submit"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingExpense ? "Salvează" : "Adaugă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi această cheltuială? Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteExpense && deleteMutation.mutate(deleteExpense.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
