import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp,
  Users,
  Calendar,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

const TARGET_CATEGORII = [
  { value: "AGENTI", label: "Agenți" },
  { value: "COMISIONARI", label: "Comisionari" },
  { value: "PARTENERI", label: "Parteneri" },
  { value: "DIRECTOR", label: "Director" },
] as const;

interface TargetData {
  id: string;
  categoria?: string;
  agentId: string | null;
  luna: number;
  an: number;
  targetVanzari: string;
  targetClienti: number;
  targetOferteTransmise?: number;
  targetFollowUp?: number;
  targetConversie?: string | null;
  targetClientiNoi?: number;
  targetColaboratoriNoi?: number;
  targetPartenerActiv?: number;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface TargetProgress {
  target: TargetData | null;
  realizedValue: number;
  realizedClients: number;
}

interface TargetWithProgress extends TargetData {
  progressSummary: {
    realizedValue: number;
    targetVanzari: number;
    percentVanzari: number;
  };
}

interface TargetDetailedProgress {
  target: TargetData | null;
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
}

const MONTHS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export default function Targeturi() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TargetData | null>(null);
  const [detailsTargetId, setDetailsTargetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    categoria: "AGENTI" as const,
    agentId: "",
    luna: new Date().getMonth() + 1,
    an: new Date().getFullYear(),
    targetVanzari: "",
    targetClienti: 0,
    targetOferteTransmise: 0,
    targetFollowUp: 0,
    targetConversie: "",
    targetClientiNoi: 0,
    targetColaboratoriNoi: 0,
    targetPartenerActiv: 0,
  });

  const { data: targets = [], isLoading } = useQuery<TargetWithProgress[]>({
    queryKey: ["targets", "with-progress", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/targets/with-progress?an=${selectedYear}&luna=${selectedMonth}`);
      if (!res.ok) throw new Error("Eroare la încărcarea target-urilor");
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
    enabled: isAdmin,
  });

  const { data: detailsProgress, isLoading: detailsLoading } = useQuery<TargetDetailedProgress>({
    queryKey: ["target-details", detailsTargetId],
    queryFn: async () => {
      const res = await fetch(`/api/targets/${detailsTargetId}/progress`);
      if (!res.ok) throw new Error("Eroare la încărcarea detaliilor");
      return res.json();
    },
    enabled: !!detailsTargetId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: data.categoria,
          agentId: data.agentId || null,
          luna: data.luna,
          an: data.an,
          targetVanzari: data.targetVanzari,
          targetClienti: data.targetClienti,
          targetOferteTransmise: data.targetOferteTransmise,
          targetFollowUp: data.targetFollowUp,
          targetConversie: data.targetConversie || null,
          targetClientiNoi: data.targetClientiNoi,
          targetColaboratoriNoi: data.targetColaboratoriNoi,
          targetPartenerActiv: data.targetPartenerActiv,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast.success("Target creat cu succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/targets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: data.categoria,
          agentId: data.agentId || null,
          luna: data.luna,
          an: data.an,
          targetVanzari: data.targetVanzari,
          targetClienti: data.targetClienti,
          targetOferteTransmise: data.targetOferteTransmise,
          targetFollowUp: data.targetFollowUp,
          targetConversie: data.targetConversie || null,
          targetClientiNoi: data.targetClientiNoi,
          targetColaboratoriNoi: data.targetColaboratoriNoi,
          targetPartenerActiv: data.targetPartenerActiv,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast.success("Target actualizat cu succes");
      setIsDialogOpen(false);
      setEditingTarget(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/targets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast.success("Target șters cu succes");
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      categoria: "AGENTI",
      agentId: "",
      luna: selectedMonth,
      an: selectedYear,
      targetVanzari: "",
      targetClienti: 0,
      targetOferteTransmise: 0,
      targetFollowUp: 0,
      targetConversie: "",
      targetClientiNoi: 0,
      targetColaboratoriNoi: 0,
      targetPartenerActiv: 0,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingTarget(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (target: TargetData) => {
    setFormData({
      categoria: (target.categoria as "AGENTI" | "COMISIONARI" | "PARTENERI" | "DIRECTOR") || "AGENTI",
      agentId: target.agentId || "",
      luna: target.luna,
      an: target.an,
      targetVanzari: target.targetVanzari,
      targetClienti: target.targetClienti,
      targetOferteTransmise: target.targetOferteTransmise ?? 0,
      targetFollowUp: target.targetFollowUp ?? 0,
      targetConversie: target.targetConversie ?? "",
      targetClientiNoi: target.targetClientiNoi ?? 0,
      targetColaboratoriNoi: target.targetColaboratoriNoi ?? 0,
      targetPartenerActiv: target.targetPartenerActiv ?? 0,
    });
    setEditingTarget(target);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.targetVanzari) {
      toast.error("Target-ul în RON este obligatoriu");
      return;
    }
    if (formData.categoria !== "DIRECTOR" && !formData.agentId) {
      toast.error("Selectează agentul");
      return;
    }

    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "—";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Necunoscut";
  };
  const getCategoriaLabel = (c: string) => TARGET_CATEGORII.find(x => x.value === c)?.label ?? c;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Target className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-title">Target-uri</h1>
            <p className="text-slate-400">
              Gestionează target-urile lunare pentru agenți
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-target">
            <Plus className="h-4 w-4" />
            Adaugă Target
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtrare
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[150px]">
              <Label>An</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label>Luna</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Target-uri {MONTHS[selectedMonth - 1]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există target-uri pentru această perioadă</p>
              {isAdmin && (
                <Button variant="outline" onClick={openCreateDialog} className="mt-4">
                  Adaugă primul target
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Target RON</TableHead>
                  <TableHead>Target Clienți</TableHead>
                  <TableHead>% îndeplinit (RON)</TableHead>
                  <TableHead className="w-[100px]">Detalii</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Acțiuni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => (
                  <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                    <TableCell className="font-medium">{getCategoriaLabel(target.categoria ?? "AGENTI")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        {getAgentName(target.agentId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {parseFloat(target.targetVanzari).toLocaleString("ro-RO")} RON
                    </TableCell>
                    <TableCell>{target.targetClienti} clienți</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={target.progressSummary.percentVanzari}
                          className="h-2 w-24"
                        />
                        <span className="text-sm font-medium tabular-nums">
                          {target.progressSummary.percentVanzari}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailsTargetId(target.id)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Detalii
                      </Button>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(target)}
                            data-testid={`button-edit-${target.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(target)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${target.id}`}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Editează Target" : "Adaugă Target Nou"}
            </DialogTitle>
            <DialogDescription>
              Categorie: agenți, comisionari, parteneri sau director. Apoi agent, perioadă și target-uri.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select value={formData.categoria} onValueChange={(v: any) => setFormData({ ...formData, categoria: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_CATEGORII.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent {formData.categoria !== "DIRECTOR" ? "*" : ""}</Label>
              <Select
                value={formData.agentId === "" || formData.agentId == null ? "__none__" : formData.agentId}
                onValueChange={(v) => setFormData({ ...formData, agentId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger data-testid="select-agent">
                  <SelectValue placeholder="Selectează agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Niciunul (Director)</SelectItem>
                  {agents.filter(agent => agent.id).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>An</Label>
                <Select value={formData.an.toString()} onValueChange={(v) => setFormData({ ...formData, an: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Luna</Label>
                <Select value={formData.luna.toString()} onValueChange={(v) => setFormData({ ...formData, luna: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target RON *</Label>
              <Input
                type="number"
                value={formData.targetVanzari}
                onChange={(e) => setFormData({ ...formData, targetVanzari: e.target.value })}
                placeholder="ex: 50000"
                data-testid="input-target-vanzari"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target clienți contactați</Label>
                <Input
                  type="number"
                  value={formData.targetClienti}
                  onChange={(e) => setFormData({ ...formData, targetClienti: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-target-clienti"
                />
              </div>
              <div className="space-y-2">
                <Label>Target oferte transmise</Label>
                <Input
                  type="number"
                  value={formData.targetOferteTransmise}
                  onChange={(e) => setFormData({ ...formData, targetOferteTransmise: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target follow-up</Label>
                <Input
                  type="number"
                  value={formData.targetFollowUp}
                  onChange={(e) => setFormData({ ...formData, targetFollowUp: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Target conversie (%)</Label>
                <Input
                  type="text"
                  value={formData.targetConversie}
                  onChange={(e) => setFormData({ ...formData, targetConversie: e.target.value })}
                  placeholder="ex: 15.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target clienți noi</Label>
                <Input
                  type="number"
                  value={formData.targetClientiNoi}
                  onChange={(e) => setFormData({ ...formData, targetClientiNoi: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Target colaboratori noi</Label>
                <Input
                  type="number"
                  value={formData.targetColaboratoriNoi}
                  onChange={(e) => setFormData({ ...formData, targetColaboratoriNoi: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target partener activ</Label>
              <Input
                type="number"
                value={formData.targetPartenerActiv}
                onChange={(e) => setFormData({ ...formData, targetPartenerActiv: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmit} data-testid="button-save-target">
              {editingTarget ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsTargetId} onOpenChange={(open) => !open && setDetailsTargetId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalii target</DialogTitle>
            <DialogDescription>
              Vezi realizarea pe fiecare categorie de target pentru luna selectată.
            </DialogDescription>
          </DialogHeader>
          {detailsLoading || !detailsProgress ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="text-sm text-slate-400">
                <div>{getCategoriaLabel(detailsProgress.target?.categoria ?? "AGENTI")} – {getAgentName(detailsProgress.target?.agentId ?? null)}</div>
                <div>
                  Luna: {MONTHS[(detailsProgress.target?.luna ?? selectedMonth) - 1]}{" "}
                  {detailsProgress.target?.an ?? selectedYear}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicator</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Realizat</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const t = detailsProgress.target;
                      const p = detailsProgress.progress;
                      const rows: { label: string; target: number | null; realized: number; isMoney?: boolean; isPercent?: boolean }[] = [
                        {
                          label: "Vânzări (RON)",
                          target: t ? parseFloat(t.targetVanzari) : null,
                          realized: p.realizedValue,
                          isMoney: true,
                        },
                        {
                          label: "Clienți contactați",
                          target: t?.targetClienti ?? null,
                          realized: p.realizedClientiContactati,
                        },
                        {
                          label: "Oferte transmise",
                          target: t?.targetOferteTransmise ?? null,
                          realized: p.realizedOferteTransmise,
                        },
                        {
                          label: "Follow-up",
                          target: t?.targetFollowUp ?? null,
                          realized: p.realizedFollowUp,
                        },
                        {
                          label: "Conversie (%)",
                          target: t?.targetConversie ? parseFloat(t.targetConversie) : null,
                          realized: p.realizedConversie ?? 0,
                          isPercent: true,
                        },
                        {
                          label: "Clienți noi",
                          target: t?.targetClientiNoi ?? null,
                          realized: p.realizedClientiNoi,
                        },
                        {
                          label: "Colaboratori noi",
                          target: t?.targetColaboratoriNoi ?? null,
                          realized: p.realizedColaboratoriNoi,
                        },
                        {
                          label: "Parteneri activi",
                          target: t?.targetPartenerActiv ?? null,
                          realized: p.realizedPartenerActiv,
                        },
                      ];

                      return rows.map((row) => {
                        const { label, target, realized, isMoney, isPercent } = row;
                        const percent =
                          target && target > 0
                            ? Math.min(100, Math.round((realized / target) * 1000) / 10)
                            : null;
                        const formatNumber = (val: number) =>
                          isMoney
                            ? `${val.toLocaleString("ro-RO")} RON`
                            : isPercent
                            ? `${val.toLocaleString("ro-RO")} %`
                            : val.toLocaleString("ro-RO");

                        return (
                          <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            <TableCell>
                              {target != null ? formatNumber(target) : <span className="text-slate-400">-</span>}
                            </TableCell>
                            <TableCell>{formatNumber(realized)}</TableCell>
                            <TableCell>
                              {percent != null ? (
                                <span className="tabular-nums">{percent}%</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va șterge target-ul {deleteTarget && `(${getCategoriaLabel(deleteTarget.categoria ?? "AGENTI")} – ${getAgentName(deleteTarget.agentId)})`}.
              Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
