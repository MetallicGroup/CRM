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
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TargetData {
  id: string;
  agentId: string;
  luna: number;
  an: number;
  targetVanzari: string;
  targetClienti: number;
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

  const [formData, setFormData] = useState({
    agentId: "",
    luna: new Date().getMonth() + 1,
    an: new Date().getFullYear(),
    targetVanzari: "",
    targetClienti: 0,
  });

  const { data: targets = [], isLoading } = useQuery<TargetData[]>({
    queryKey: ["targets", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/targets?an=${selectedYear}&luna=${selectedMonth}`);
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/targets", {
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
        body: JSON.stringify(data),
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
      agentId: "",
      luna: selectedMonth,
      an: selectedYear,
      targetVanzari: "",
      targetClienti: 0,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingTarget(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (target: TargetData) => {
    setFormData({
      agentId: target.agentId,
      luna: target.luna,
      an: target.an,
      targetVanzari: target.targetVanzari,
      targetClienti: target.targetClienti,
    });
    setEditingTarget(target);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.agentId || !formData.targetVanzari) {
      toast.error("Completează toate câmpurile obligatorii");
      return;
    }

    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "Necunoscut";
  };

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
            <p className="text-muted-foreground">
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
            <div className="text-center py-8 text-muted-foreground">
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
                  <TableHead>Agent</TableHead>
                  <TableHead>Target Vânzări</TableHead>
                  <TableHead>Target Clienți</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Acțiuni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => (
                  <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {getAgentName(target.agentId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {parseFloat(target.targetVanzari).toLocaleString("ro-RO")} RON
                    </TableCell>
                    <TableCell>{target.targetClienti} clienți</TableCell>
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
              Setează target-ul lunar pentru un agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Agent *</Label>
              <Select value={formData.agentId} onValueChange={(v) => setFormData({ ...formData, agentId: v })}>
                <SelectTrigger data-testid="select-agent">
                  <SelectValue placeholder="Selectează agent" />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Target Vânzări (RON) *</Label>
              <Input
                type="number"
                value={formData.targetVanzari}
                onChange={(e) => setFormData({ ...formData, targetVanzari: e.target.value })}
                placeholder="ex: 50000"
                data-testid="input-target-vanzari"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Clienți</Label>
              <Input
                type="number"
                value={formData.targetClienti}
                onChange={(e) => setFormData({ ...formData, targetClienti: parseInt(e.target.value) || 0 })}
                placeholder="ex: 10"
                data-testid="input-target-clienti"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va șterge target-ul pentru {deleteTarget && getAgentName(deleteTarget.agentId)}.
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
