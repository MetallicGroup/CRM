import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ListTodo,
  Plus,
  Settings,
  Edit,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  numeProiect: string;
  dataLimita: string | null;
  createdById: string;
  assignedAgentId: string | null;
  observatii: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

const TABS = [
  { id: "list", label: "Listă" },
  { id: "deadline", label: "Termen limită" },
  { id: "planner", label: "Planner" },
  { id: "calendar", label: "Calendar" },
  { id: "gantt", label: "Gantt" },
];

export default function TaskuriProiecte() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    numeProiect: "",
    dataLimita: "",
    createdById: "",
    assignedAgentId: "",
    observatii: "",
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter && roleFilter !== "all") params.set("assignedAgentId", roleFilter);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea task-urilor");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents-minimal"],
    queryFn: async () => {
      const res = await fetch("/api/users/agents");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeProiect: data.numeProiect,
          dataLimita: data.dataLimita || null,
          createdById: data.createdById || user?.id,
          assignedAgentId: data.assignedAgentId || null,
          observatii: data.observatii || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la creare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateOpen(false);
      setFormData({ numeProiect: "", dataLimita: "", createdById: user?.id || "", assignedAgentId: "", observatii: "" });
      toast.success("Task creat cu succes");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeProiect: data.numeProiect,
          dataLimita: data.dataLimita || null,
          createdById: data.createdById || undefined,
          assignedAgentId: data.assignedAgentId || null,
          observatii: data.observatii ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la actualizare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
      setFormData({ numeProiect: "", dataLimita: "", createdById: "", assignedAgentId: "", observatii: "" });
      toast.success("Task actualizat cu succes");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la ștergere");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTaskToDelete(null);
      toast.success("Task șters cu succes");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setFormData({
      numeProiect: "",
      dataLimita: "",
      createdById: user?.id || "",
      assignedAgentId: "",
      observatii: "",
    });
    setIsCreateOpen(true);
  };

  const openEdit = (task: Task) => {
    setFormData({
      numeProiect: task.numeProiect,
      dataLimita: task.dataLimita ? format(parseISO(task.dataLimita), "yyyy-MM-dd") : "",
      createdById: task.createdById,
      assignedAgentId: task.assignedAgentId || "",
      observatii: task.observatii || "",
    });
    setEditingTask(task);
  };

  const getAgentName = (id: string | null) => {
    if (!id) return "—";
    const a = agents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : id;
  };

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.numeProiect.toLowerCase().includes(s) ||
      (t.observatii && t.observatii.toLowerCase().includes(s)) ||
      getAgentName(t.assignedAgentId).toLowerCase().includes(s) ||
      getAgentName(t.createdById).toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0c0f] text-slate-200">
      {/* Header: title + Create + filters — Bitrix style */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-white">Task-uri</h1>
          <button
            type="button"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1f2937]"
            title="Setări"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="task-create"
          >
            <Plus className="h-4 w-4 mr-2" />
            Creează
          </Button>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] bg-[#111827] border-[#1f2937] text-slate-200">
              <SelectValue placeholder="Toate rolurile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate rolurile</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Input
              placeholder="Caută..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] bg-[#111827] border-[#1f2937] text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs: Listă, Termen limită, Planner, Calendar, Gantt */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f2937] bg-[#0a0c0f]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#1f2937] text-[#fbbf24]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f2937]/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content: only List implemented */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "list" && (
          <div className="rounded-xl border border-[#1f2937] bg-[#111827]/50 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">Se încarcă...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <ListTodo className="h-14 w-14 text-slate-500 mb-4" />
                <p className="text-lg font-semibold text-slate-200 mb-1">Creați un task</p>
                <p className="text-sm text-slate-400 max-w-md">
                  Această listă va afișa task-urile și proiectele pentru care sunteți responsabil sau pe care le-ați creat.
                </p>
                <Button onClick={openCreate} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Creează task
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1f2937] hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium w-[40px]"> </TableHead>
                    <TableHead className="text-slate-400 font-medium">Nume proiect</TableHead>
                    <TableHead className="text-slate-400 font-medium">Data limită</TableHead>
                    <TableHead className="text-slate-400 font-medium">Creat de</TableHead>
                    <TableHead className="text-slate-400 font-medium">Agentul asignat</TableHead>
                    <TableHead className="text-slate-400 font-medium">Observații</TableHead>
                    <TableHead className="text-slate-400 font-medium w-[100px]">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="border-[#1f2937] hover:bg-[#1f2937]/50">
                      <TableCell className="w-[40px]">
                        <input type="checkbox" className="rounded border-slate-500 bg-[#111827]" />
                      </TableCell>
                      <TableCell className="font-medium text-slate-200">{task.numeProiect}</TableCell>
                      <TableCell className="text-slate-300">
                        {task.dataLimita
                          ? format(parseISO(task.dataLimita), "dd MMM yyyy", { locale: ro })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-slate-300">{getAgentName(task.createdById)}</TableCell>
                      <TableCell className="text-slate-300">{getAgentName(task.assignedAgentId)}</TableCell>
                      <TableCell className="text-slate-300 max-w-[280px] truncate">
                        {task.observatii || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-[#fbbf24]"
                            onClick={() => openEdit(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => setTaskToDelete(task)}
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
          </div>
        )}

        {activeTab !== "list" && (
          <div className="rounded-xl border border-[#1f2937] bg-[#111827]/50 flex items-center justify-center py-20 text-slate-500">
            Vedere „{TABS.find((t) => t.id === activeTab)?.label}” va fi implementată ulterior.
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#111827] border-[#1f2937] text-slate-200">
          <DialogHeader>
            <DialogTitle>Task nou</DialogTitle>
            <DialogDescription>Adăugați un nou task sau proiect.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nume proiect</Label>
              <Input
                value={formData.numeProiect}
                onChange={(e) => setFormData((p) => ({ ...p, numeProiect: e.target.value }))}
                placeholder="Ex: Pregătire ofertă X"
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data limită</Label>
              <Input
                type="date"
                value={formData.dataLimita}
                onChange={(e) => setFormData((p) => ({ ...p, dataLimita: e.target.value }))}
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Creat de</Label>
              <Select
                value={formData.createdById}
                onValueChange={(v) => setFormData((p) => ({ ...p, createdById: v }))}
              >
                <SelectTrigger className="bg-[#0a0c0f] border-[#1f2937]">
                  <SelectValue placeholder="Selectați" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agentul asignat</Label>
              <Select
                value={formData.assignedAgentId || "none"}
                onValueChange={(v) => setFormData((p) => ({ ...p, assignedAgentId: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="bg-[#0a0c0f] border-[#1f2937]">
                  <SelectValue placeholder="Selectați agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Niciunul</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Observații</Label>
              <Input
                value={formData.observatii}
                onChange={(e) => setFormData((p) => ({ ...p, observatii: e.target.value }))}
                placeholder="Observații opționale"
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-[#1f2937]">
              Anulare
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.numeProiect || createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMutation.isPending ? "Se creează..." : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="bg-[#111827] border-[#1f2937] text-slate-200">
          <DialogHeader>
            <DialogTitle>Editare task</DialogTitle>
            <DialogDescription>Modificați detaliile task-ului.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nume proiect</Label>
              <Input
                value={formData.numeProiect}
                onChange={(e) => setFormData((p) => ({ ...p, numeProiect: e.target.value }))}
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data limită</Label>
              <Input
                type="date"
                value={formData.dataLimita}
                onChange={(e) => setFormData((p) => ({ ...p, dataLimita: e.target.value }))}
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Creat de</Label>
              <Select
                value={formData.createdById}
                onValueChange={(v) => setFormData((p) => ({ ...p, createdById: v }))}
              >
                <SelectTrigger className="bg-[#0a0c0f] border-[#1f2937]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agentul asignat</Label>
              <Select
                value={formData.assignedAgentId || "none"}
                onValueChange={(v) => setFormData((p) => ({ ...p, assignedAgentId: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="bg-[#0a0c0f] border-[#1f2937]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Niciunul</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Observații</Label>
              <Input
                value={formData.observatii}
                onChange={(e) => setFormData((p) => ({ ...p, observatii: e.target.value }))}
                className="bg-[#0a0c0f] border-[#1f2937]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)} className="border-[#1f2937]">
              Anulare
            </Button>
            <Button
              onClick={() =>
                editingTask &&
                updateMutation.mutate({
                  id: editingTask.id,
                  data: formData,
                })
              }
              disabled={!formData.numeProiect || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent className="bg-[#111827] border-[#1f2937]">
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergeți task-ul?</AlertDialogTitle>
            <AlertDialogDescription>
              Acest task va fi șters definitiv. Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#1f2937]">Anulare</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
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
