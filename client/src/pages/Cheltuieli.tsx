import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Receipt,
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  User,
  Calendar,
  Car,
  FileText,
  TrendingUp,
  Filter,
  Upload,
  Download,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { SalariiNeproductivi } from "@/components/SalariiNeproductivi";

interface ExpenseCategory {
  id: string;
  name: string;
  parentId: string | null;
  level: string;
}

interface Sediu {
  id: string;
  nume: string;
  judet: string | null;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface CheltuialaAgent {
  id: string;
  agentId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  detailCategoryId: string | null;
  suma: string;
  descriere: string | null;
  dataCheltuiala: string;
  luna: number;
  an: number;
  judet: string | null;
  sediuId: string | null;
  firma: string | null;
  autoNr: string | null;
  facturaFilename: string | null;
  documentUrl: string | null;
  createdAt: string;
}

interface CheltuialaSediu {
  id: string;
  sediuId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  detailCategoryId: string | null;
  suma: string;
  descriere: string | null;
  dataCheltuiala: string;
  luna: number;
  an: number;
  firma: string | null;
  facturaFilename: string | null;
  documentUrl: string | null;
  createdAt: string;
}

const FIRME = [
  "MM ROOF INTERMED SRL",
  "METALLIC GROUP SRL",
  "ROOFERS RO",
];

const CATEGORY_COLORS: Record<string, string> = {
  "cat-salarii": "bg-green-100 text-green-800",
  "cat-auto": "bg-blue-100 text-blue-800",
  "cat-generale": "bg-purple-100 text-purple-800",
  "cat-bugete": "bg-orange-100 text-orange-800",
};

export default function Cheltuieli() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();

  const [activeTab, setActiveTab] = useState<"agent" | "sediu" | "salarii">("agent");
  const [search, setSearch] = useState("");
  const [lunaFilter, setLunaFilter] = useState<string>(String(currentDate.getMonth() + 1));
  const [anFilter, setAnFilter] = useState<string>(String(currentDate.getFullYear()));
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sediuFilter, setSediuFilter] = useState<string>("all");
  const [firmaFilter, setFirmaFilter] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCheltuiala, setEditingCheltuiala] = useState<CheltuialaAgent | CheltuialaSediu | null>(null);
  const [deleteCheltuiala, setDeleteCheltuiala] = useState<{ id: string; type: "agent" | "sediu" } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    agentId: "",
    sediuId: "",
    categoryId: "",
    subcategoryId: "",
    detailCategoryId: "",
    suma: "",
    descriere: "",
    dataCheltuiala: format(new Date(), "yyyy-MM-dd"),
    judet: "",
    firma: "",
    autoNr: "",
    facturaFilename: "",
    documentUrl: "",
  });

  const { data: mainCategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories-main"],
    queryFn: async () => {
      const res = await fetch("/api/expense-categories/main");
      if (!res.ok) throw new Error("Eroare la încărcarea categoriilor");
      return res.json();
    },
  });

  const { data: subcategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories-sub", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const res = await fetch(`/api/expense-categories/sub/${selectedCategory}`);
      if (!res.ok) throw new Error("Eroare la încărcarea subcategoriilor");
      return res.json();
    },
    enabled: !!selectedCategory,
  });

  const { data: detailCategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories-detail", selectedSubcategory],
    queryFn: async () => {
      if (!selectedSubcategory) return [];
      const res = await fetch(`/api/expense-categories/detail/${selectedSubcategory}`);
      if (!res.ok) throw new Error("Eroare la încărcarea detaliilor");
      return res.json();
    },
    enabled: !!selectedSubcategory,
  });

  const { data: sedii = [] } = useQuery<Sediu[]>({
    queryKey: ["sedii"],
    queryFn: async () => {
      const res = await fetch("/api/sedii?activ=true");
      if (!res.ok) throw new Error("Eroare la încărcarea sediilor");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["cheltuieli-angajati"],
    queryFn: async () => {
      const res = await fetch("/api/cheltuieli/angajati");
      if (!res.ok) throw new Error("Eroare la încărcarea angajaților");
      return res.json();
    },
  });

  const { data: cheltuieliAgent = [], isLoading: loadingAgent } = useQuery<CheltuialaAgent[]>({
    queryKey: ["cheltuieli-agent", lunaFilter, anFilter, agentFilter, categoryFilter, sediuFilter, firmaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lunaFilter && lunaFilter !== "all") params.set("luna", lunaFilter);
      if (anFilter && anFilter !== "all") params.set("an", anFilter);
      if (agentFilter && agentFilter !== "all") params.set("agentId", agentFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (sediuFilter && sediuFilter !== "all") params.set("sediuId", sediuFilter);
      if (firmaFilter && firmaFilter !== "all") params.set("firma", firmaFilter);
      const res = await fetch(`/api/cheltuieli-agent?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea cheltuielilor");
      return res.json();
    },
  });

  const { data: cheltuieliSediu = [], isLoading: loadingSediu } = useQuery<CheltuialaSediu[]>({
    queryKey: ["cheltuieli-sediu", lunaFilter, anFilter, sediuFilter, categoryFilter, firmaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lunaFilter && lunaFilter !== "all") params.set("luna", lunaFilter);
      if (anFilter && anFilter !== "all") params.set("an", anFilter);
      if (sediuFilter && sediuFilter !== "all") params.set("sediuId", sediuFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (firmaFilter && firmaFilter !== "all") params.set("firma", firmaFilter);
      const res = await fetch(`/api/cheltuieli-sediu?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea cheltuielilor");
      return res.json();
    },
  });

  const { data: statsAgent } = useQuery<{ total: number; byCategory: Record<string, number> }>({
    queryKey: ["cheltuieli-agent-stats", lunaFilter, anFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lunaFilter && lunaFilter !== "all") params.set("luna", lunaFilter);
      if (anFilter && anFilter !== "all") params.set("an", anFilter);
      const res = await fetch(`/api/cheltuieli-agent/stats?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea statisticilor");
      return res.json();
    },
  });

  const { data: statsSediu } = useQuery<{ total: number; byCategory: Record<string, number> }>({
    queryKey: ["cheltuieli-sediu-stats", lunaFilter, anFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lunaFilter && lunaFilter !== "all") params.set("luna", lunaFilter);
      if (anFilter && anFilter !== "all") params.set("an", anFilter);
      const res = await fetch(`/api/cheltuieli-sediu/stats?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea statisticilor");
      return res.json();
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      const date = new Date(data.dataCheltuiala);
      const payload = {
        ...data,
        luna: date.getMonth() + 1,
        an: date.getFullYear(),
      };
      const res = await fetch("/api/cheltuieli-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent-stats"] });
      toast.success("Cheltuială agent adăugată cu succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createSediuMutation = useMutation({
    mutationFn: async (data: any) => {
      const date = new Date(data.dataCheltuiala);
      const payload = {
        ...data,
        luna: date.getMonth() + 1,
        an: date.getFullYear(),
      };
      const res = await fetch("/api/cheltuieli-sediu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-stats"] });
      toast.success("Cheltuială sediu adăugată cu succes");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const date = new Date(data.dataCheltuiala);
      const payload = {
        ...data,
        luna: date.getMonth() + 1,
        an: date.getFullYear(),
      };
      const res = await fetch(`/api/cheltuieli-agent/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent-stats"] });
      toast.success("Cheltuială actualizată cu succes");
      setIsDialogOpen(false);
      setEditingCheltuiala(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSediuMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const date = new Date(data.dataCheltuiala);
      const payload = {
        ...data,
        luna: date.getMonth() + 1,
        an: date.getFullYear(),
      };
      const res = await fetch(`/api/cheltuieli-sediu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-stats"] });
      toast.success("Cheltuială actualizată cu succes");
      setIsDialogOpen(false);
      setEditingCheltuiala(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cheltuieli-agent/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-agent-stats"] });
      toast.success("Cheltuială ștearsă cu succes");
      setDeleteCheltuiala(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteSediuMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cheltuieli-sediu/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu"] });
      queryClient.invalidateQueries({ queryKey: ["cheltuieli-sediu-stats"] });
      toast.success("Cheltuială ștearsă cu succes");
      setDeleteCheltuiala(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      agentId: "",
      sediuId: "",
      categoryId: "",
      subcategoryId: "",
      detailCategoryId: "",
      suma: "",
      descriere: "",
      dataCheltuiala: format(new Date(), "yyyy-MM-dd"),
      judet: "",
      firma: "",
      autoNr: "",
      facturaFilename: "",
      documentUrl: "",
    });
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedFile(null);
  };

  const handleOpenDialog = (cheltuiala?: CheltuialaAgent | CheltuialaSediu) => {
    if (cheltuiala) {
      setEditingCheltuiala(cheltuiala);
      setFormData({
        agentId: (cheltuiala as CheltuialaAgent).agentId || "",
        sediuId: (cheltuiala as CheltuialaSediu).sediuId || (cheltuiala as CheltuialaAgent).sediuId || "",
        categoryId: cheltuiala.categoryId || "",
        subcategoryId: cheltuiala.subcategoryId || "",
        detailCategoryId: cheltuiala.detailCategoryId || "",
        suma: cheltuiala.suma,
        descriere: cheltuiala.descriere || "",
        dataCheltuiala: format(new Date(cheltuiala.dataCheltuiala), "yyyy-MM-dd"),
        judet: (cheltuiala as CheltuialaAgent).judet || "",
        firma: cheltuiala.firma || "",
        autoNr: (cheltuiala as CheltuialaAgent).autoNr || "",
        facturaFilename: cheltuiala.facturaFilename || "",
        documentUrl: cheltuiala.documentUrl || "",
      });
      setSelectedCategory(cheltuiala.categoryId || "");
      setSelectedSubcategory(cheltuiala.subcategoryId || "");
      setSelectedFile(null);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("folder", "cheltuieli");

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `Eroare server: ${res.statusText} (${res.status})`);
      }

      const result = await res.json();
      return result.url;
    } catch (err: any) {
      toast.error("Eroare la încărcarea documentului: " + err.message);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let documentUrl = formData.documentUrl;

    if (selectedFile) {
      setIsUploading(true);
      const uploadedUrl = await handleFileUpload(selectedFile);
      setIsUploading(false);

      if (uploadedUrl) {
        documentUrl = uploadedUrl;
      }
    }

    const data = {
      ...formData,
      categoryId: selectedCategory,
      subcategoryId: selectedSubcategory,
      documentUrl,
    };

    if (editingCheltuiala) {
      if (activeTab === "agent") {
        updateAgentMutation.mutate({ id: editingCheltuiala.id, data });
      } else {
        updateSediuMutation.mutate({ id: editingCheltuiala.id, data });
      }
    } else {
      if (activeTab === "agent") {
        createAgentMutation.mutate(data);
      } else {
        createSediuMutation.mutate(data);
      }
    }
  };

  const handleDelete = () => {
    if (!deleteCheltuiala) return;

    if (deleteCheltuiala.type === "agent") {
      deleteAgentMutation.mutate(deleteCheltuiala.id);
    } else {
      deleteSediuMutation.mutate(deleteCheltuiala.id);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const cat = mainCategories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "-";
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : "-";
  };

  const getSediuName = (sediuId: string | null) => {
    if (!sediuId) return "-";
    const sediu = sedii.find(s => s.id === sediuId);
    return sediu?.nume || "-";
  };

  const totalAgent = statsAgent?.total || 0;
  const totalSediu = statsSediu?.total || 0;
  const totalGeneral = totalAgent + totalSediu;

  const MONTHS = [
    { value: "1", label: "Ianuarie" },
    { value: "2", label: "Februarie" },
    { value: "3", label: "Martie" },
    { value: "4", label: "Aprilie" },
    { value: "5", label: "Mai" },
    { value: "6", label: "Iunie" },
    { value: "7", label: "Iulie" },
    { value: "8", label: "August" },
    { value: "9", label: "Septembrie" },
    { value: "10", label: "Octombrie" },
    { value: "11", label: "Noiembrie" },
    { value: "12", label: "Decembrie" },
  ];

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-cheltuieli">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Cheltuieli
          </h1>
          <p className="text-slate-400 mt-1">
            Gestionează cheltuielile pentru agenți și sedii
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-cheltuiala">
            <Plus className="mr-2 h-4 w-4" />
            Adaugă Cheltuială
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cheltuieli</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalGeneral.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cheltuieli Agent</CardTitle>
            <User className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalAgent.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cheltuieli Sediu</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalSediu.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} LEI
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filtre</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <Label>Luna</Label>
              <Select value={lunaFilter} onValueChange={setLunaFilter}>
                <SelectTrigger data-testid="select-luna">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>An</Label>
              <Select value={anFilter} onValueChange={setAnFilter}>
                <SelectTrigger data-testid="select-an">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {YEARS.map(y => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger data-testid="select-agent-filter">
                  <SelectValue placeholder="Toți" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="Toate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {mainCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sediu</Label>
              <Select value={sediuFilter} onValueChange={setSediuFilter}>
                <SelectTrigger data-testid="select-sediu-filter">
                  <SelectValue placeholder="Toate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {sedii.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nume}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Firmă</Label>
              <Select value={firmaFilter} onValueChange={setFirmaFilter}>
                <SelectTrigger data-testid="select-firma-filter">
                  <SelectValue placeholder="Toate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {FIRME.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "agent" | "sediu" | "salarii")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agent" className="flex items-center gap-2" data-testid="tab-agent">
            <User className="h-4 w-4" />
            Cheltuieli Agent ({cheltuieliAgent.length})
          </TabsTrigger>
          <TabsTrigger value="sediu" className="flex items-center gap-2" data-testid="tab-sediu">
            <Building2 className="h-4 w-4" />
            Cheltuieli Sediu ({cheltuieliSediu.length})
          </TabsTrigger>
          <TabsTrigger value="salarii" className="flex items-center gap-2" data-testid="tab-salarii">
            <Receipt className="h-4 w-4" />
            Salarii Neproductivi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent">
          <Card>
            <CardContent className="pt-6">
              {loadingAgent ? (
                <p className="text-center py-8 text-slate-400">Se încarcă...</p>
              ) : cheltuieliAgent.length === 0 ? (
                <p className="text-center py-8 text-slate-400">Nu există cheltuieli înregistrate</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Sediu</TableHead>
                      <TableHead>Firmă</TableHead>
                      <TableHead>Nr. Auto</TableHead>
                      <TableHead>Doc</TableHead>
                      <TableHead className="text-right">Suma (LEI)</TableHead>
                      {isAdmin && <TableHead className="text-right">Acțiuni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cheltuieliAgent.map((c) => (
                      <TableRow key={c.id} data-testid={`row-cheltuiala-agent-${c.id}`}>
                        <TableCell>
                          {format(new Date(c.dataCheltuiala), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{getAgentName(c.agentId)}</TableCell>
                        <TableCell>
                          <Badge className={cn(CATEGORY_COLORS[c.categoryId || ""] || "bg-gray-100 text-gray-800")}>
                            {getCategoryName(c.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSediuName(c.sediuId)}</TableCell>
                        <TableCell>{c.firma || "-"}</TableCell>
                        <TableCell>
                          {c.autoNr && (
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              {c.autoNr}
                            </span>
                          )}
                          {!c.autoNr && "-"}
                        </TableCell>
                        <TableCell>
                          {c.documentUrl ? (
                            <a
                              href={c.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                              title="Descarcă document"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {parseFloat(c.suma).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(c)}
                                data-testid={`button-edit-agent-${c.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteCheltuiala({ id: c.id, type: "agent" })}
                                data-testid={`button-delete-agent-${c.id}`}
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
        </TabsContent>

        <TabsContent value="sediu">
          <Card>
            <CardContent className="pt-6">
              {loadingSediu ? (
                <p className="text-center py-8 text-slate-400">Se încarcă...</p>
              ) : cheltuieliSediu.length === 0 ? (
                <p className="text-center py-8 text-slate-400">Nu există cheltuieli înregistrate</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Sediu</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Firmă</TableHead>
                      <TableHead>Descriere</TableHead>
                      <TableHead>Doc</TableHead>
                      <TableHead className="text-right">Suma (LEI)</TableHead>
                      {isAdmin && <TableHead className="text-right">Acțiuni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cheltuieliSediu.map((c) => (
                      <TableRow key={c.id} data-testid={`row-cheltuiala-sediu-${c.id}`}>
                        <TableCell>
                          {format(new Date(c.dataCheltuiala), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{getSediuName(c.sediuId)}</TableCell>
                        <TableCell>
                          <Badge className={cn(CATEGORY_COLORS[c.categoryId || ""] || "bg-gray-100 text-gray-800")}>
                            {getCategoryName(c.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.firma || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{c.descriere || "-"}</TableCell>
                        <TableCell>
                          {c.documentUrl ? (
                            <a
                              href={c.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                              title="Descarcă document"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {parseFloat(c.suma).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(c)}
                                data-testid={`button-edit-sediu-${c.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteCheltuiala({ id: c.id, type: "sediu" })}
                                data-testid={`button-delete-sediu-${c.id}`}
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
        </TabsContent>

        <TabsContent value="salarii">
          <SalariiNeproductivi luna={parseInt(lunaFilter)} an={parseInt(anFilter)} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCheltuiala ? "Editare Cheltuială" : "Adăugare Cheltuială"}
              {activeTab === "agent" ? " Agent" : " Sediu"}
            </DialogTitle>
            <DialogDescription>
              Completați detaliile cheltuielii
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suma">Suma (LEI) *</Label>
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
                <Label htmlFor="dataCheltuiala">Data Cheltuielii *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tip Cheltuială (Categorie) *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setSelectedCategory(val);
                    setSelectedSubcategory("");
                    setFormData({ ...formData, categoryId: val, subcategoryId: "", detailCategoryId: "" });
                  }}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Selectează categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategorie *</Label>
                <Select
                  value={selectedSubcategory}
                  onValueChange={(val) => {
                    setSelectedSubcategory(val);
                    setFormData({ ...formData, subcategoryId: val, detailCategoryId: "" });
                  }}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger data-testid="select-subcategory">
                    <SelectValue placeholder="Selectează subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {detailCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Detaliu (opțional)</Label>
                <Select
                  value={formData.detailCategoryId}
                  onValueChange={(val) => setFormData({ ...formData, detailCategoryId: val })}
                >
                  <SelectTrigger data-testid="select-detail">
                    <SelectValue placeholder="Selectează detaliu" />
                  </SelectTrigger>
                  <SelectContent>
                    {detailCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === "agent" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select
                    value={formData.agentId}
                    onValueChange={(val) => setFormData({ ...formData, agentId: val })}
                  >
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder="Selectează agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sediu</Label>
                  <Select
                    value={formData.sediuId}
                    onValueChange={(val) => setFormData({ ...formData, sediuId: val })}
                  >
                    <SelectTrigger data-testid="select-sediu">
                      <SelectValue placeholder="Selectează sediu" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedii.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nume}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeTab === "sediu" && (
              <div className="space-y-2">
                <Label>Sediu *</Label>
                <Select
                  value={formData.sediuId}
                  onValueChange={(val) => setFormData({ ...formData, sediuId: val })}
                >
                  <SelectTrigger data-testid="select-sediu-form">
                    <SelectValue placeholder="Selectează sediu" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedii.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nume}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Firmă *</Label>
                <Select
                  value={formData.firma}
                  onValueChange={(val) => setFormData({ ...formData, firma: val })}
                >
                  <SelectTrigger data-testid="select-firma">
                    <SelectValue placeholder="Selectează firma" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIRME.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeTab === "agent" && (
                <div className="space-y-2">
                  <Label htmlFor="autoNr">Număr Auto</Label>
                  <Input
                    id="autoNr"
                    value={formData.autoNr}
                    onChange={(e) => setFormData({ ...formData, autoNr: e.target.value })}
                    placeholder="ex: B 123 ABC"
                    data-testid="input-auto-nr"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriere">Descriere</Label>
              <Textarea
                id="descriere"
                value={formData.descriere}
                onChange={(e) => setFormData({ ...formData, descriere: e.target.value })}
                placeholder="Descriere cheltuială..."
                rows={3}
                data-testid="textarea-descriere"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">Document Atașat</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                  data-testid="input-document"
                />
                {selectedFile && (
                  <span className="text-sm text-slate-400 truncate max-w-[150px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              {formData.documentUrl && !selectedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <a
                    href={formData.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Document existent - click pentru descărcare
                  </a>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Fișiere acceptate: PDF, Excel, Word, Imagini (max 10MB)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingCheltuiala(null);
                  resetForm();
                }}
              >
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={isUploading || createAgentMutation.isPending || createSediuMutation.isPending || updateAgentMutation.isPending || updateSediuMutation.isPending}
                data-testid="button-submit"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se încarcă...
                  </>
                ) : editingCheltuiala ? "Salvează" : "Adaugă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCheltuiala} onOpenChange={() => setDeleteCheltuiala(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur doriți să ștergeți această cheltuială? Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
