import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye,
  Package,
  FileText,
  Calendar,
  MessageSquare,
  Handshake,
  Download,
  File as FileIcon,
  Upload,
} from "lucide-react";
import { ClientImportDialog } from "@/components/ClientImportDialog";
import { ObjectUploader, uploadFileForClient } from "@/components/ObjectUploader";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type {
  Client,
  CreateClient,
  OfferStatus,
  OrderStatus,
  ClientSource,
  ProductCategory,
  ColorRAL,
  Thickness,
  FinishType,
  Brand,
  CommissionPercent
} from "@shared/schema";

const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string; color: string }[] = [
  { value: "NOUA", label: "Nouă", color: "bg-blue-100 text-blue-800" },
  { value: "TRIMISA", label: "Trimisă", color: "bg-cyan-100 text-cyan-800" },
  { value: "IN_ASTEPTARE", label: "În Așteptare (Follow-up)", color: "bg-yellow-100 text-yellow-800" },
  { value: "ACCEPTATA", label: "Acceptată", color: "bg-indigo-100 text-indigo-800" },
  { value: "VANDUT", label: "Vândut", color: "bg-green-100 text-green-800" },
  { value: "REFUZAT", label: "Refuzat/Pierdut", color: "bg-red-100 text-red-800" },
  { value: "ANULATA", label: "Anulată", color: "bg-gray-100 text-gray-800" },
  { value: "INFORMATII", label: "Informații", color: "bg-purple-100 text-purple-800" },
];

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "CUSTODIE", label: "Custodie" },
  { value: "COMANDAT", label: "Comandat" },
  { value: "LISTAT", label: "Listat" },
  { value: "IN_PRODUCTIE", label: "În producție" },
  { value: "PRODUS", label: "Produs" },
  { value: "LIVRAT", label: "Livrat" },
];

const SOURCE_OPTIONS: { value: ClientSource; label: string }[] = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "GOOGLE", label: "Google" },
  { value: "RECLAME_CAMPANII", label: "Reclame / Campanii" },
  { value: "SITE", label: "Site" },
  { value: "RECOMANDARE", label: "Recomandare" },
  { value: "TARG", label: "Târg" },
  { value: "OLX", label: "OLX" },
  { value: "CEL_RO", label: "Cel.ro" },
  { value: "OKAZII", label: "Okazii" },
  { value: "PUBLI24", label: "Publi24" },
  { value: "TELEFON", label: "Telefon" },
  { value: "MONTATORI", label: "Montatori" },
  { value: "BIROU_SHOWROOM", label: "Birou/Showroom" },
  { value: "COMPLETARE", label: "Completare" },
  { value: "TIKTOK", label: "Tik Tok" },
  { value: "PARTENERI", label: "Parteneri" },
];

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "ACOPERIS", label: "Acoperiș" },
  { value: "GARD", label: "Gard" },
  { value: "FATADA", label: "Fațadă" },
  { value: "SISTEM_PLUVIAL", label: "Sistem pluvial" },
  { value: "SAGEAC", label: "Sageac" },
  { value: "ELEMENTE_SPECIALE", label: "Elemente speciale" },
  { value: "FERESTRE_MANSARDA", label: "Ferestre mansardă" },
  { value: "SCARI_ACCES", label: "Scări acces" },
  { value: "ACCESORII_FERESTRE", label: "Accesorii ferestre/usi" },
  { value: "SCULE", label: "Scule" },
];

const COLOR_OPTIONS: { value: ColorRAL; label: string }[] = [
  { value: "RAL_9005", label: "RAL 9005 (Negru)" },
  { value: "RAL_7016", label: "RAL 7016 (Gri antracit)" },
  { value: "RAL_7024", label: "RAL 7024 (Gri grafit)" },
  { value: "RAL_8019", label: "RAL 8019 (Maro gri)" },
  { value: "RAL_8017", label: "RAL 8017 (Maro ciocolată)" },
  { value: "RAL_3005", label: "RAL 3005 (Vișiniu)" },
  { value: "RAL_8004", label: "RAL 8004 (Maro cupru)" },
  { value: "RAL_9002", label: "RAL 9002 (Alb gri)" },
  { value: "RAL_6005", label: "RAL 6005 (Verde mușchi)" },
  { value: "RAL_6020", label: "RAL 6020 (Verde crom)" },
  { value: "RAL_3011", label: "RAL 3011 (Roșu închis)" },
  { value: "RAL_7001", label: "RAL 7001 (Gri argintiu)" },
  { value: "RAL_1015", label: "RAL 1015 (Crem)" },
];

const THICKNESS_OPTIONS: { value: Thickness; label: string }[] = [
  { value: "0.50", label: "0.50 mm" },
  { value: "0.60", label: "0.60 mm" },
];

const FINISH_OPTIONS: { value: FinishType; label: string }[] = [
  { value: "MAT", label: "Mat" },
  { value: "LUCIOS", label: "Lucios" },
  { value: "BRILIANT", label: "Briliant" },
  { value: "MAT_DUO", label: "Mat DUO" },
  { value: "LUCIOS_DUO", label: "Lucios DUO" },
  { value: "BRILIANT_DUO", label: "Briliant DUO" },
];

const BRAND_OPTIONS: { value: Brand; label: string }[] = [
  { value: "CARETTA", label: "Caretta" },
  { value: "BILKA", label: "Bilka" },
  { value: "WETTERBEST", label: "Wetterbest" },
  { value: "METALLIC_GROUP", label: "Metallic Group" },
  { value: "MX", label: "MX" },
  { value: "ZEBRA", label: "Zebra" },
  { value: "FAKRO", label: "Fakro" },
  { value: "VELUX", label: "Velux" },
  { value: "NOVATIK", label: "Novatik" },
  { value: "METIGLA", label: "Metigla" },
  { value: "BUDMAT", label: "Budmat" },
  { value: "STUBAI", label: "Stubai" },
  { value: "TPS", label: "TPS" },
  { value: "ROOF4YOU", label: "Roof4You" },
];

type ModelOption = { value: string; label: string };

// Config: modele pe categorie + brand (bazat pe tabelul dat)
const PRODUCT_MODEL_OPTIONS: Partial<
  Record<ProductCategory, Partial<Record<Brand, ModelOption[]>>>
> = {
  ACOPERIS: {
    CARETTA: [
      { value: "Attica", label: "Attica" },
      { value: "Daily", label: "Daily" },
      { value: "Bello", label: "Bello" },
      { value: "Regal", label: "Regal" },
      { value: "Nobel", label: "Nobel" },
      { value: "Canto", label: "Canto" },
      { value: "Tabla cutata CRT 18", label: "Tabla cutată CRT 18" },
      { value: "Tabla cutata CRT 20", label: "Tabla cutată CRT 20" },
      { value: "Tabla cutata CRT 35", label: "Tabla cutată CRT 35" },
    ],
    BILKA: [
      { value: "Classic", label: "Classic" },
      { value: "Balcanic", label: "Balcanic" },
      { value: "Gothic", label: "Gothic" },
      { value: "Iberic", label: "Iberic" },
      { value: "Romantic", label: "Romantic" },
      { value: "Britanic", label: "Britanic" },
      { value: "Adriatic", label: "Adriatic" },
      { value: "Helenic", label: "Helenic" },
      { value: "Click", label: "Click" },
      { value: "Faltz", label: "Faltz" },
      { value: "Tabla cutata T8", label: "Tabla cutată T8" },
      { value: "Tabla cutata T12", label: "Tabla cutată T12" },
      { value: "Tabla cutata T18", label: "Tabla cutată T18" },
      { value: "Tabla cutata T35", label: "Tabla cutată T35" },
      { value: "Tabla cutata T45", label: "Tabla cutată T45" },
    ],
    WETTERBEST: [
      { value: "Classic", label: "Classic" },
      { value: "Gladiator", label: "Gladiator" },
      { value: "Cardinal", label: "Cardinal" },
      { value: "Imperator", label: "Imperator" },
      { value: "Plus", label: "Plus" },
      { value: "Colosseum", label: "Colosseum" },
      { value: "Click", label: "Click" },
      { value: "Faltz", label: "Faltz" },
      { value: "Tabla cutata W8", label: "Tabla cutată W8" },
      { value: "Tabla cutata W10", label: "Tabla cutată W10" },
      { value: "Tabla cutata W18", label: "Tabla cutată W18" },
      { value: "Tabla cutata W35", label: "Tabla cutată W35" },
      { value: "Tabla cutata W60", label: "Tabla cutată W60" },
    ],
  },
  GARD: {
    MX: [
      { value: "MX 15", label: "MX 15" },
      { value: "MX 25", label: "MX 25" },
      { value: "MX 60", label: "MX 60" },
      { value: "MC 75", label: "MC 75" },
      { value: "MC 105", label: "MC 105" },
      { value: "MX 15 DUO", label: "MX 15 DUO" },
      { value: "MX 25 DUO", label: "MX 25 DUO" },
      { value: "MX 60 DUO", label: "MX 60 DUO" },
      { value: "MC 75 DUO", label: "MC 75 DUO" },
      { value: "MC 105 DUO", label: "MC 105 DUO" },
    ],
    CARETTA: [
      { value: "Sipca gard", label: "Șipcă gard" },
      { value: "X 121", label: "X 121" },
      { value: "X 135", label: "X 135" },
      { value: "X 174", label: "X 174" },
      { value: "X 121 2F", label: "X 121 2F" },
      { value: "X 135 2F", label: "X 135 2F" },
      { value: "X 120 caseta", label: "X 120 casetă" },
      { value: "X 138 caseta", label: "X 138 casetă" },
      { value: "X 140 caseta", label: "X 140 casetă" },
    ],
    WETTERBEST: [
      { value: "Sipca W 91", label: "Șipcă W 91" },
      { value: "Sipca W 107", label: "Șipcă W 107" },
      { value: "Sipca B 93", label: "Șipcă B 93" },
      { value: "Sipca B 105", label: "Șipcă B 105" },
    ],
    BILKA: [
      { value: "Sipca Y 109", label: "Șipcă Y 109" },
      { value: "Sipca Y 112", label: "Șipcă Y 112" },
      { value: "Sipca Y 115", label: "Șipcă Y 115" },
      { value: "Sipca Y 118", label: "Șipcă Y 118" },
    ],
  },
};

const LEGACY_MODEL_OPTIONS: ModelOption[] = [
  { value: "SIPCA_GARD", label: "Șipcă Gard" },
  { value: "TRAFORAT", label: "Traforat" },
  { value: "MX_15", label: "MX 15" },
  { value: "MX_25", label: "MX 25" },
  { value: "MX_60", label: "MX 60" },
  { value: "MC_75", label: "MC 75" },
  { value: "MC_105", label: "MC 105" },
  { value: "MX_15_DUO", label: "MX 15 DUO" },
  { value: "MX_25_DUO", label: "MX 25 DUO" },
  { value: "MX_60_DUO", label: "MX 60 DUO" },
  { value: "MC_75_DUO", label: "MC 75 DUO" },
  { value: "MC_105_DUO", label: "MC 105 DUO" },
  { value: "CLASIC", label: "Clasic" },
  { value: "CANTO", label: "Canto" },
  { value: "NOBEL", label: "Nobel" },
  { value: "GLADIATOR", label: "Gladiator" },
  { value: "IBERIC", label: "Iberic" },
  { value: "BALCANIC", label: "Balcanic" },
  { value: "X121", label: "X121" },
  { value: "X140", label: "X140" },
  { value: "X174", label: "X174" },
  { value: "Y109", label: "Y109" },
  { value: "Y118", label: "Y118" },
  { value: "DAILY", label: "Daily" },
];

const getAvailableModels = (
  categorieProdus?: ProductCategory,
  brand?: Brand
): ModelOption[] => {
  if (categorieProdus && PRODUCT_MODEL_OPTIONS[categorieProdus]) {
    const byBrand = PRODUCT_MODEL_OPTIONS[categorieProdus]!;
    if (brand && byBrand[brand] && byBrand[brand]!.length > 0) {
      return byBrand[brand]!;
    }
    return Object.values(byBrand).flat();
  }

  return LEGACY_MODEL_OPTIONS;
};

const COMMISSION_OPTIONS: { value: CommissionPercent; label: string }[] = [
  { value: "1", label: "1%" },
  { value: "2", label: "2%" },
  { value: "3", label: "3%" },
];

const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brașov", "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
];

function getOfferStatusBadge(status: OfferStatus | null) {
  if (!status) return <Badge className="bg-gray-100 text-gray-800">-</Badge>;
  const option = OFFER_STATUS_OPTIONS.find(s => s.value === status);
  return (
    <Badge className={cn("font-medium", option?.color)}>
      {option?.label || status}
    </Badge>
  );
}

const defaultFormData: Partial<CreateClient> = {
  nume: "",
  telefon: "",
  email: "",
  judet: "",
  localitate: "",
  sursa: "ALTELE",
  isPartnerOrder: false,
  partnerId: "",
  categorieProdus: undefined,
  brand: undefined,
  model: undefined,
  suprafataMp: "",
  grosime: undefined,
  finisaj: undefined,
  culoare: undefined,
  mlRulouProd: "",
  smartDripstop: false,
  valoareOferta: "",
  stadiuOferta: "NOUA",
  dataOfertarii: "",
  avans: false,
  stadiuComanda: undefined,
  dataVanzarii: "",
  dataLivrarii: "",
  procentComision: undefined,
  comisionOferta: "",
  incasat: false,
  pretAchizitie: "",
  ofertaFilename: "",
  ofertaFilename2: "",
  dataRevenire1: "",
  comentariuObservatii1: "",
  followUpEfectuat1: false,
  dataRevenire2: "",
  comentariuObservatii2: "",
  followUpEfectuat2: false,
  dataRevenire3: "",
  comentariuObservatii3: "",
  followUpEfectuat3: false,
  observatiiClient: "",
  comentariiDupaContact: "",
  contactat: false,
  agentId: "",
};

export default function Clienti() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stadiuFilter, setStadiuFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<CreateClient>>(defaultFormData);
  const [pendingFiles, setPendingFiles] = useState<{ oferta1?: File; oferta2?: File }>({});
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [sheetId, setSheetId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients", search, stadiuFilter, agentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (stadiuFilter && stadiuFilter !== "all") params.set("stadiuOferta", stadiuFilter);
      if (agentFilter && agentFilter !== "all") params.set("agentId", agentFilter);

      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea clienților");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
    retry: false,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/partners");
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
    retry: false,
  });

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
    onSuccess: async (newClient) => {
      if (pendingFiles.oferta1 || pendingFiles.oferta2) {
        try {
          if (pendingFiles.oferta1) {
            await uploadFileForClient(pendingFiles.oferta1, newClient.id, "oferta1");
          }
          if (pendingFiles.oferta2) {
            await uploadFileForClient(pendingFiles.oferta2, newClient.id, "oferta2");
          }
          toast.success("Client creat și fișiere încărcate cu succes");
        } catch (uploadError) {
          console.error("[Clienti] File upload error:", uploadError);
          const msg = uploadError instanceof Error ? uploadError.message : "Eroare necunoscută";
          toast.warning(`Client creat, dar încărcarea fișierelor a eșuat: ${msg}. Încercați din nou la editare.`);
        }
      } else {
        toast.success("Client creat cu succes");
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/integrations/google-sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la sincronizare");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(data.message);
      setIsSyncDialogOpen(false);
      setSheetId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsSyncing(false);
    }
  });

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormData({
      ...defaultFormData,
      agentId: isAdmin ? "" : (user?.id || ""),
    });
    setPendingFiles({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nume: client.nume,
      telefon: client.telefon,
      email: client.email || "",
      judet: client.judet || "",
      localitate: client.localitate || "",
      sursa: client.sursa || "ALTELE",
      isPartnerOrder: client.isPartnerOrder || false,
      partnerId: client.partnerId || "",
      categorieProdus: client.categorieProdus || undefined,
      brand: client.brand || undefined,
      model: client.model || undefined,
      suprafataMp: client.suprafataMp || "",
      grosime: client.grosime || undefined,
      finisaj: client.finisaj || undefined,
      culoare: client.culoare || undefined,
      mlRulouProd: client.mlRulouProd || "",
      smartDripstop: client.smartDripstop || false,
      valoareOferta: client.valoareOferta || "",
      stadiuOferta: (client.stadiuOferta as any === "NOU" ? "NOUA" :
        client.stadiuOferta as any === "FOLLOW_UP" ? "IN_ASTEPTARE" :
          client.stadiuOferta as any === "OFERTAT" ? "TRIMISA" :
            client.stadiuOferta as any === "PIERDUT" ? "REFUZAT" :
              client.stadiuOferta) || "NOUA",
      dataOfertarii: client.dataOfertarii ? format(new Date(client.dataOfertarii), "yyyy-MM-dd") : "",
      avans: client.avans || false,
      stadiuComanda: client.stadiuComanda || undefined,
      dataVanzarii: client.dataVanzarii ? format(new Date(client.dataVanzarii), "yyyy-MM-dd") : "",
      dataLivrarii: client.dataLivrarii ? format(new Date(client.dataLivrarii), "yyyy-MM-dd") : "",
      procentComision: client.procentComision || undefined,
      comisionOferta: client.comisionOferta || "",
      incasat: client.incasat || false,
      pretAchizitie: client.pretAchizitie || "",
      ofertaFilename: client.ofertaFilename || "",
      ofertaFilename2: client.ofertaFilename2 || "",
      dataRevenire1: client.dataRevenire1 ? format(new Date(client.dataRevenire1), "yyyy-MM-dd") : "",
      comentariuObservatii1: client.comentariuObservatii1 || "",
      followUpEfectuat1: client.followUpEfectuat1 || false,
      dataRevenire2: client.dataRevenire2 ? format(new Date(client.dataRevenire2), "yyyy-MM-dd") : "",
      comentariuObservatii2: client.comentariuObservatii2 || "",
      followUpEfectuat2: client.followUpEfectuat2 || false,
      dataRevenire3: client.dataRevenire3 ? format(new Date(client.dataRevenire3), "yyyy-MM-dd") : "",
      comentariuObservatii3: client.comentariuObservatii3 || "",
      followUpEfectuat3: client.followUpEfectuat3 || false,
      observatiiClient: client.observatiiClient || "",
      comentariiDupaContact: client.comentariiDupaContact || "",
      contactat: client.contactat || false,
      agentId: client.agentId || "",
      numCriteriu: client.numCriteriu ?? undefined,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setPendingFiles({});
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
    setStadiuFilter("all");
    setAgentFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Clienți</h1>
            <p className="text-muted-foreground">
              Gestionează baza de date cu clienți și oferte
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2" data-testid="button-import-clients">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsSyncDialogOpen(true)} className="gap-2 text-green-700 border-green-200 hover:bg-green-50" data-testid="button-google-sync">
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            Sincronizează Google Sheets
          </Button>
          <Button onClick={openCreateDialog} className="gap-2" data-testid="button-add-client">
            <Plus className="h-4 w-4" />
            Adaugă Client
          </Button>
        </div>
      </div>

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
            <Select value={stadiuFilter} onValueChange={setStadiuFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-stadiu-filter">
                <SelectValue placeholder="Toate stadiile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate stadiile</SelectItem>
                {OFFER_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-full md:w-[200px]" data-testid="select-agent-filter">
                  <SelectValue placeholder="Toți agenții" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți agenții</SelectItem>
                  {agents.filter((a: any) => a.role === "AGENT" || a.role === "ADMIN").map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

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
                {search || stadiuFilter !== "all" || agentFilter !== "all"
                  ? "Modifică filtrele pentru a vedea mai mulți clienți"
                  : "Adaugă primul client pentru a începe"}
              </p>
              {!search && stadiuFilter === "all" && agentFilter === "all" && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adaugă Client
                </Button>
              )}
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">Nr.</TableHead>
                  <TableHead className="w-[15%]">Nume</TableHead>
                  <TableHead className="w-[15%]">Contact</TableHead>
                  <TableHead className="w-[15%]">Locație</TableHead>
                  <TableHead className="w-[10%]">Stadiu</TableHead>
                  <TableHead className="w-[12%]">Categorie</TableHead>
                  <TableHead className="w-[10%]">Valoare</TableHead>
                  <TableHead className="w-[8%]">Doc</TableHead>
                  <TableHead className="w-[10%] text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                    <TableCell className="py-2 text-center text-xs font-mono text-muted-foreground">
                      {client.numCriteriu || ""}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="truncate">
                        <div className="font-medium truncate" title={client.nume}>{client.nume}</div>
                        <div className="text-xs text-muted-foreground">
                          {SOURCE_OPTIONS.find(s => s.value === client.sursa)?.label}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{client.telefon}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate" title={client.email}>{client.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {client.judet || client.localitate ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" title={[client.localitate, client.judet].filter(Boolean).join(", ")}>
                            {[client.localitate, client.judet].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">{getOfferStatusBadge(client.stadiuOferta)}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_OPTIONS.find(c => c.value === client.categorieProdus)?.label || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {client.valoareOferta ? (
                        <span className="font-medium text-xs whitespace-nowrap">
                          {Number(client.valoareOferta).toLocaleString("ro-RO")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        {client.ofertaFilename && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${window.location.origin}${client.ofertaFilename}`, '_blank', 'noopener');
                            }}
                            title="Descarcă Ofertă 1"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {client.ofertaFilename2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${window.location.origin}${client.ofertaFilename2}`, '_blank', 'noopener');
                            }}
                            title="Descarcă Ofertă 2"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setViewClient(client)}
                          data-testid={`button-view-${client.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(client)}
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => setDeleteClient(client)}
                            data-testid={`button-delete-${client.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editează Client" : "Adaugă Client Nou"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Modifică datele clientului" : "Completează datele noului client"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="contact" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="contact" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Contact
                </TabsTrigger>
                <TabsTrigger value="product" className="gap-2">
                  <Package className="h-4 w-4" />
                  Produs
                </TabsTrigger>
                <TabsTrigger value="offer" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Ofertă
                </TabsTrigger>
                <TabsTrigger value="followup" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Follow-up
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observații
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-4 mt-4">
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
                    <Label htmlFor="telefon">Telefon *</Label>
                    <Input
                      id="telefon"
                      value={formData.telefon}
                      onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                      required
                      data-testid="input-telefon"
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
                {formData.numCriteriu && (
                  <div className="space-y-2">
                    <Label>Nr. Criteriu</Label>
                    <Input
                      value={formData.numCriteriu}
                      readOnly
                      disabled
                      className="bg-gray-100 font-mono text-center"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="judet">Județ</Label>
                    <Select
                      value={formData.judet || "none"}
                      onValueChange={(value) => setFormData({ ...formData, judet: value === "none" ? "" : value })}
                    >
                      <SelectTrigger data-testid="select-judet">
                        <SelectValue placeholder="Selectează județul" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sursa">Sursă</Label>
                    <Select
                      value={formData.sursa || "ALTELE"}
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
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="agentId">Agent</Label>
                      <Select
                        value={formData.agentId || "none"}
                        onValueChange={(value) => setFormData({ ...formData, agentId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger data-testid="select-agent">
                          <SelectValue placeholder="Selectează agentul" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Neasignat</SelectItem>
                          {agents.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPartnerOrder"
                    checked={formData.isPartnerOrder}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPartnerOrder: !!checked })}
                    data-testid="checkbox-partner-order"
                  />
                  <Label htmlFor="isPartnerOrder" className="flex items-center gap-2">
                    <Handshake className="h-4 w-4" />
                    Comandă de la partener
                  </Label>
                </div>
                {formData.isPartnerOrder && (
                  <div className="space-y-2">
                    <Label htmlFor="partnerId">Partener</Label>
                    <Select
                      value={formData.partnerId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, partnerId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger data-testid="select-partner">
                        <SelectValue placeholder="Selectează partenerul" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {partners.map((partner: any) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.nume}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="product" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categorieProdus">Categorie Produs</Label>
                    <Select
                      value={formData.categorieProdus || "none"}
                      onValueChange={(value) => setFormData({ ...formData, categorieProdus: value === "none" ? undefined : value as ProductCategory })}
                    >
                      <SelectTrigger data-testid="select-categorie">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Select
                      value={formData.brand || "none"}
                      onValueChange={(value) => setFormData({ ...formData, brand: value === "none" ? undefined : value as Brand })}
                    >
                      <SelectTrigger data-testid="select-brand">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {BRAND_OPTIONS.map((brand) => (
                          <SelectItem key={brand.value} value={brand.value}>
                            {brand.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select
                      value={formData.model || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          model: value === "none" ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger data-testid="select-model">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {useMemo(
                          () =>
                            getAvailableModels(
                              formData.categorieProdus as ProductCategory | undefined,
                              formData.brand as Brand | undefined
                            ),
                          [formData.categorieProdus, formData.brand]
                        ).map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suprafataMp">Suprafață (mp)</Label>
                    <Input
                      id="suprafataMp"
                      type="number"
                      step="0.01"
                      value={formData.suprafataMp}
                      onChange={(e) => setFormData({ ...formData, suprafataMp: e.target.value })}
                      data-testid="input-suprafata"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="culoare">Culoare</Label>
                    <Select
                      value={formData.culoare || "none"}
                      onValueChange={(value) => setFormData({ ...formData, culoare: value === "none" ? undefined : value as ColorRAL })}
                    >
                      <SelectTrigger data-testid="select-culoare">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {COLOR_OPTIONS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grosime">Grosime</Label>
                    <Select
                      value={formData.grosime || "none"}
                      onValueChange={(value) => setFormData({ ...formData, grosime: value === "none" ? undefined : value as Thickness })}
                    >
                      <SelectTrigger data-testid="select-grosime">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {THICKNESS_OPTIONS.map((thickness) => (
                          <SelectItem key={thickness.value} value={thickness.value}>
                            {thickness.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="finisaj">Finisaj</Label>
                    <Select
                      value={formData.finisaj || "none"}
                      onValueChange={(value) => setFormData({ ...formData, finisaj: value === "none" ? undefined : value as FinishType })}
                    >
                      <SelectTrigger data-testid="select-finisaj">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {FINISH_OPTIONS.map((finish) => (
                          <SelectItem key={finish.value} value={finish.value}>
                            {finish.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mlRulouProd">ML Rulou Producție</Label>
                    <Input
                      id="mlRulouProd"
                      type="number"
                      step="0.01"
                      value={formData.mlRulouProd}
                      onChange={(e) => setFormData({ ...formData, mlRulouProd: e.target.value })}
                      data-testid="input-ml-rulou"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id="smartDripstop"
                      checked={formData.smartDripstop}
                      onCheckedChange={(checked) => setFormData({ ...formData, smartDripstop: !!checked })}
                      data-testid="checkbox-dripstop"
                    />
                    <Label htmlFor="smartDripstop">Smart Dripstop</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="offer" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stadiuOferta">Stadiu Ofertă</Label>
                    <Select
                      value={formData.stadiuOferta || "NOU"}
                      onValueChange={(value) => setFormData({ ...formData, stadiuOferta: value as OfferStatus })}
                    >
                      <SelectTrigger data-testid="select-stadiu-oferta">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valoareOferta">Valoare Ofertă (RON)</Label>
                    <Input
                      id="valoareOferta"
                      type="number"
                      step="0.01"
                      value={formData.valoareOferta}
                      onChange={(e) => {
                        const newValoare = e.target.value;
                        const valoareOferta = parseFloat(newValoare || "0");
                        const comisionCalculat = formData.procentComision
                          ? (valoareOferta * parseInt(formData.procentComision) / 100).toFixed(2)
                          : "";
                        setFormData({
                          ...formData,
                          valoareOferta: newValoare,
                          comisionOferta: comisionCalculat
                        });
                      }}
                      data-testid="input-valoare-oferta"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataOfertarii">Data Ofertării</Label>
                    <Input
                      id="dataOfertarii"
                      type="date"
                      value={formData.dataOfertarii}
                      onChange={(e) => setFormData({ ...formData, dataOfertarii: e.target.value })}
                      data-testid="input-data-ofertare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stadiuComanda">Stadiu Comandă</Label>
                    <Select
                      value={formData.stadiuComanda || "none"}
                      onValueChange={(value) => setFormData({ ...formData, stadiuComanda: value === "none" ? undefined : value as OrderStatus })}
                    >
                      <SelectTrigger data-testid="select-stadiu-comanda">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="avans"
                    checked={formData.avans || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, avans: !!checked })}
                    data-testid="checkbox-avans"
                  />
                  <Label htmlFor="avans" className="text-sm font-normal cursor-pointer">
                    Avans
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataVanzarii">Data Vânzării</Label>
                    <Input
                      id="dataVanzarii"
                      type="date"
                      value={formData.dataVanzarii}
                      onChange={(e) => setFormData({ ...formData, dataVanzarii: e.target.value })}
                      data-testid="input-data-vanzare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataLivrarii">Data Livrării</Label>
                    <Input
                      id="dataLivrarii"
                      type="date"
                      value={formData.dataLivrarii}
                      onChange={(e) => setFormData({ ...formData, dataLivrarii: e.target.value })}
                      data-testid="input-data-livrare"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="procentComision">Procent Comision</Label>
                    <Select
                      value={formData.procentComision || "none"}
                      onValueChange={(value) => {
                        const newProcentComision = value === "none" ? undefined : value as CommissionPercent;
                        const valoareOferta = parseFloat(formData.valoareOferta || "0");
                        const comisionCalculat = newProcentComision
                          ? (valoareOferta * parseInt(newProcentComision) / 100).toFixed(2)
                          : "";
                        setFormData({
                          ...formData,
                          procentComision: newProcentComision,
                          comisionOferta: comisionCalculat
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-procent-comision">
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Neselectat</SelectItem>
                        {COMMISSION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comisionOferta">Comision Ofertă (RON)</Label>
                    <Input
                      id="comisionOferta"
                      type="number"
                      step="0.01"
                      value={formData.comisionOferta}
                      readOnly
                      className="bg-muted"
                      data-testid="input-comision-oferta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pretAchizitie">Preț Achiziție (RON)</Label>
                    <Input
                      id="pretAchizitie"
                      type="number"
                      step="0.01"
                      value={formData.pretAchizitie}
                      onChange={(e) => setFormData({ ...formData, pretAchizitie: e.target.value })}
                      data-testid="input-pret-achizitie"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incasat"
                    checked={formData.incasat}
                    onCheckedChange={(checked) => setFormData({ ...formData, incasat: !!checked })}
                    data-testid="checkbox-incasat"
                  />
                  <Label htmlFor="incasat">Încasat</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ofertaFilename">Fișier Ofertă 1</Label>
                    <div className="flex items-center gap-2">
                      {formData.ofertaFilename ? (
                        <>
                          <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate flex-1">
                              {formData.ofertaFilename.split('/').pop() || "Fișier încărcat"}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${window.location.origin}${formData.ofertaFilename}`, '_blank', 'noopener')}
                            data-testid="button-download-oferta-1"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, ofertaFilename: "" })}
                            data-testid="button-remove-oferta-1"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <ObjectUploader
                          clientId={editingClient?.id}
                          fileType="oferta1"
                          pendingFile={pendingFiles.oferta1}
                          onComplete={(objectPath, filename) => {
                            setFormData({ ...formData, ofertaFilename: objectPath });
                            toast.success(`Fișier "${filename}" încărcat cu succes`);
                          }}
                          onFileSelected={(file) => {
                            setPendingFiles({ ...pendingFiles, oferta1: file });
                            toast.success(`Fișier "${file.name}" selectat - va fi încărcat la salvare`);
                          }}
                          onError={(error) => toast.error(error.message)}
                          data-testid="uploader-oferta-1"
                        >
                          Încarcă Fișier
                        </ObjectUploader>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ofertaFilename2">Fișier Ofertă 2</Label>
                    <div className="flex items-center gap-2">
                      {formData.ofertaFilename2 ? (
                        <>
                          <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate flex-1">
                              {formData.ofertaFilename2.split('/').pop() || "Fișier încărcat"}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${window.location.origin}${formData.ofertaFilename2}`, '_blank', 'noopener')}
                            data-testid="button-download-oferta-2"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, ofertaFilename2: "" })}
                            data-testid="button-remove-oferta-2"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <ObjectUploader
                          clientId={editingClient?.id}
                          fileType="oferta2"
                          pendingFile={pendingFiles.oferta2}
                          onComplete={(objectPath, filename) => {
                            setFormData({ ...formData, ofertaFilename2: objectPath });
                            toast.success(`Fișier "${filename}" încărcat cu succes`);
                          }}
                          onFileSelected={(file) => {
                            setPendingFiles({ ...pendingFiles, oferta2: file });
                            toast.success(`Fișier "${file.name}" selectat - va fi încărcat la salvare`);
                          }}
                          onError={(error) => toast.error(error.message)}
                          data-testid="uploader-oferta-2"
                        >
                          Încarcă Fișier
                        </ObjectUploader>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-6 mt-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Follow-up 1</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataRevenire1">Data Revenire</Label>
                      <Input
                        id="dataRevenire1"
                        type="date"
                        value={formData.dataRevenire1}
                        onChange={(e) => setFormData({ ...formData, dataRevenire1: e.target.value })}
                        data-testid="input-data-revenire-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="followUpEfectuat1"
                        checked={formData.followUpEfectuat1}
                        onCheckedChange={(checked) => setFormData({ ...formData, followUpEfectuat1: !!checked })}
                        data-testid="checkbox-followup-1"
                      />
                      <Label htmlFor="followUpEfectuat1">Efectuat</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comentariuObservatii1">Comentariu</Label>
                    <Textarea
                      id="comentariuObservatii1"
                      value={formData.comentariuObservatii1}
                      onChange={(e) => setFormData({ ...formData, comentariuObservatii1: e.target.value })}
                      rows={2}
                      data-testid="textarea-comentariu-1"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Follow-up 2</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataRevenire2">Data Revenire</Label>
                      <Input
                        id="dataRevenire2"
                        type="date"
                        value={formData.dataRevenire2}
                        onChange={(e) => setFormData({ ...formData, dataRevenire2: e.target.value })}
                        data-testid="input-data-revenire-2"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="followUpEfectuat2"
                        checked={formData.followUpEfectuat2}
                        onCheckedChange={(checked) => setFormData({ ...formData, followUpEfectuat2: !!checked })}
                        data-testid="checkbox-followup-2"
                      />
                      <Label htmlFor="followUpEfectuat2">Efectuat</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comentariuObservatii2">Comentariu</Label>
                    <Textarea
                      id="comentariuObservatii2"
                      value={formData.comentariuObservatii2}
                      onChange={(e) => setFormData({ ...formData, comentariuObservatii2: e.target.value })}
                      rows={2}
                      data-testid="textarea-comentariu-2"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Follow-up 3</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataRevenire3">Data Revenire</Label>
                      <Input
                        id="dataRevenire3"
                        type="date"
                        value={formData.dataRevenire3}
                        onChange={(e) => setFormData({ ...formData, dataRevenire3: e.target.value })}
                        data-testid="input-data-revenire-3"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="followUpEfectuat3"
                        checked={formData.followUpEfectuat3}
                        onCheckedChange={(checked) => setFormData({ ...formData, followUpEfectuat3: !!checked })}
                        data-testid="checkbox-followup-3"
                      />
                      <Label htmlFor="followUpEfectuat3">Efectuat</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comentariuObservatii3">Comentariu</Label>
                    <Textarea
                      id="comentariuObservatii3"
                      value={formData.comentariuObservatii3}
                      onChange={(e) => setFormData({ ...formData, comentariuObservatii3: e.target.value })}
                      rows={2}
                      data-testid="textarea-comentariu-3"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contactat"
                    checked={formData.contactat}
                    onCheckedChange={(checked) => setFormData({ ...formData, contactat: !!checked })}
                    data-testid="checkbox-contactat"
                  />
                  <Label htmlFor="contactat">Contactat</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observatiiClient">Observații Client</Label>
                  <Textarea
                    id="observatiiClient"
                    value={formData.observatiiClient}
                    onChange={(e) => setFormData({ ...formData, observatiiClient: e.target.value })}
                    rows={3}
                    data-testid="textarea-observatii-client"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comentariiDupaContact">Comentarii după Contact</Label>
                  <Textarea
                    id="comentariiDupaContact"
                    value={formData.comentariiDupaContact}
                    onChange={(e) => setFormData({ ...formData, comentariiDupaContact: e.target.value })}
                    rows={3}
                    data-testid="textarea-comentarii-contact"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
                  : editingClient ? "Salvează" : "Adaugă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalii Client</DialogTitle>
            <DialogDescription>
              {viewClient?.nume}
            </DialogDescription>
          </DialogHeader>

          {viewClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{viewClient.telefon}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewClient.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Locație</p>
                  <p className="font-medium">
                    {[viewClient.localitate, viewClient.judet].filter(Boolean).join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sursă</p>
                  <p className="font-medium">
                    {SOURCE_OPTIONS.find(s => s.value === viewClient.sursa)?.label || "-"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Detalii Produs</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Categorie</p>
                    <p className="font-medium">
                      {CATEGORY_OPTIONS.find(c => c.value === viewClient.categorieProdus)?.label || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Brand</p>
                    <p className="font-medium">{viewClient.brand || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{viewClient.model || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Suprafață</p>
                    <p className="font-medium">{viewClient.suprafataMp ? `${viewClient.suprafataMp} mp` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Culoare</p>
                    <p className="font-medium">
                      {COLOR_OPTIONS.find(c => c.value === viewClient.culoare)?.label || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grosime</p>
                    <p className="font-medium">
                      {THICKNESS_OPTIONS.find(t => t.value === viewClient.grosime)?.label || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Ofertă</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Stadiu Ofertă</p>
                    {getOfferStatusBadge(viewClient.stadiuOferta)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valoare</p>
                    <p className="font-medium">
                      {viewClient.valoareOferta
                        ? `${Number(viewClient.valoareOferta).toLocaleString("ro-RO")} RON`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Ofertării</p>
                    <p className="font-medium">
                      {viewClient.dataOfertarii
                        ? format(new Date(viewClient.dataOfertarii), "dd MMM yyyy", { locale: ro })
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {viewClient.observatiiClient && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Observații</h4>
                  <p className="text-sm">{viewClient.observatiiClient}</p>
                </div>
              )}

              {(viewClient.ofertaFilename || viewClient.ofertaFilename2) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Documente</h4>
                  <div className="flex flex-wrap gap-3">
                    {viewClient.ofertaFilename && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${window.location.origin}${viewClient.ofertaFilename}`, '_blank', 'noopener')}
                        className="gap-2"
                        data-testid="button-view-download-oferta-1"
                      >
                        <Download className="h-4 w-4" />
                        {viewClient.ofertaFilename.split('/').pop() || "Ofertă 1"}
                      </Button>
                    )}
                    {viewClient.ofertaFilename2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${window.location.origin}${viewClient.ofertaFilename2}`, '_blank', 'noopener')}
                        className="gap-2"
                        data-testid="button-view-download-oferta-2"
                      >
                        <Download className="h-4 w-4" />
                        {viewClient.ofertaFilename2.split('/').pop() || "Ofertă 2"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi clientul {deleteClient?.nume}?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClient && deleteMutation.mutate(deleteClient.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClientImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        agents={agents}
      />

      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronizare Google Sheets</DialogTitle>
            <DialogDescription>
              Introdu ID-ul fișierului Google Sheets pentru a importa clienții.
              Asigură-te că fișierul este partajat cu email-ul robotului de sincronizare.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheetId">ID Fișier (din URL-ul Google Sheets)</Label>
              <Input
                id="sheetId"
                placeholder="ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronizarea va importa rândurile care conțin Nume și Telefon, setând Sursa ca fiind Facebook.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>Anulează</Button>
            <Button
              onClick={() => {
                setIsSyncing(true);
                syncMutation.mutate(sheetId);
              }}
              disabled={!sheetId || isSyncing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSyncing ? "Se sincronizează..." : "Începe Sincronizarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
