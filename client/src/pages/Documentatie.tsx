import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth";
import { FileStack, FileText, Upload, FolderOpen, Trash2, Download, Info, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORII = [
  { id: "FURNIZORI", label: "Furnizori", icon: FileText, color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  { id: "PARTENERI", label: "Parteneri", icon: FolderOpen, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { id: "METALLIC_GROUP", label: "Metallic Group", icon: FileStack, color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { id: "FISA_TEHNICA", label: "Fișă tehnică", icon: FileText, color: "bg-violet-500/20 text-violet-400 border-violet-500/40" },
] as const;

type ViewMode = "list" | "grid" | "tile";

interface DocumentEntry {
  id: string;
  categorie: string;
  nume: string;
  objectPath: string;
  fileName: string | null;
  uploadedById: string | null;
  uploadedAt: string;
  uploadedByFirstName?: string;
  uploadedByLastName?: string;
}

export default function Documentatie() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // Non-admin: doar Fișă tehnică – forțează filtrul
  const categoriiVizibile = isAdmin ? CATEGORII : CATEGORII.filter((c) => c.id === "FISA_TEHNICA");
  useEffect(() => {
    if (!isAdmin && categoryFilter !== "FISA_TEHNICA") setCategoryFilter("FISA_TEHNICA");
  }, [isAdmin, categoryFilter]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORII[0].id);
  const [numeDocument, setNumeDocument] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchFisaTehnica, setSearchFisaTehnica] = useState("");

  const { data: documente = [], isLoading } = useQuery<DocumentEntry[]>({
    queryKey: ["documente", categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.set("categorie", categoryFilter);
      const res = await fetch(`/api/documente?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea documentelor");
      return res.json();
    },
  });

  // Căutare text doar pentru documentele din Fișă tehnică (client-side)
  const isFisaTehnicaView = categoryFilter === "FISA_TEHNICA";
  const documenteAfisate =
    isFisaTehnicaView && searchFisaTehnica.trim()
      ? documente.filter(
          (d) =>
            d.nume.toLowerCase().includes(searchFisaTehnica.trim().toLowerCase()) ||
            (d.fileName?.toLowerCase().includes(searchFisaTehnica.trim().toLowerCase()) ?? false)
        )
      : documente;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documente/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documente"] });
      toast.success("Document șters");
    },
    onError: () => toast.error("Nu s-a putut șterge documentul"),
  });

  const openUploadFor = (categorieId: string) => {
    setSelectedCategory(categorieId);
    setNumeDocument("");
    setFile(null);
    setUploadModalOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !numeDocument.trim()) {
      toast.error("Selectați un fișier și introduceți numele documentului.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documente");
      const uploadRes = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la încărcarea fișierului");
      }
      const { url, filename } = await uploadRes.json();
      const createRes = await fetch("/api/documente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          categorie: selectedCategory,
          nume: numeDocument.trim(),
          objectPath: url,
          fileName: filename,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message || "Eroare la salvarea documentului");
      }
      queryClient.invalidateQueries({ queryKey: ["documente"] });
      toast.success("Document încărcat.");
      setUploadModalOpen(false);
      setFile(null);
      setNumeDocument("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (id: string) => CATEGORII.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <FileStack className="h-8 w-8 text-[#fbbf24]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Documentație</h1>
          <p className="text-sm text-slate-400">
            Facturi, contracte, fișe tehnice – pe categorii. Adminii încarcă documentele.
          </p>
        </div>
      </div>

      {/* Create – cards categorii (stil Bitrix) */}
      {isAdmin && (
        <Card className="border-[#1f2937] bg-[#0f172a]/80 overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Create</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoriiVizibile.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openUploadFor(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all",
                    "bg-slate-800/50 border-slate-700 hover:border-[#fbbf24]/50 hover:bg-slate-800 text-slate-200"
                  )}
                >
                  <cat.icon className={cn("h-10 w-10 mb-2", cat.color.split(" ")[1])} />
                  <span className="text-sm font-medium">{cat.label}</span>
                  <Upload className="h-4 w-4 mt-1 text-slate-500" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtru + view mode */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setSearchFisaTehnica(""); }}>
          <SelectTrigger className="w-[200px] bg-[#111827] border-[#1f2937]">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            {isAdmin && <SelectItem value="all">Toate categoriile</SelectItem>}
            {categoriiVizibile.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFisaTehnicaView && (
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Caută în Fișă tehnică (nume, fișier)..."
              value={searchFisaTehnica}
              onChange={(e) => setSearchFisaTehnica(e.target.value)}
              className="pl-9 bg-[#111827] border-[#1f2937] text-slate-200 placeholder:text-slate-500"
            />
          </div>
        )}
        <div className="flex rounded-lg border border-[#1f2937] overflow-hidden">
          {(["list", "grid", "tile"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-2 text-sm capitalize",
                viewMode === mode
                  ? "bg-[#fbbf24] text-black"
                  : "bg-[#111827] text-slate-400 hover:text-slate-200"
              )}
            >
              {mode === "list" ? "Listă" : mode === "grid" ? "Grid" : "Tile"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel istoric */}
      <Card className="border-[#1f2937] bg-[#0f172a]/80 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Se încarcă...</div>
          ) : documenteAfisate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="rounded-full bg-sky-500/20 p-4 mb-4">
                <Info className="h-12 w-12 text-sky-400" />
              </div>
              <p className="text-lg font-medium text-slate-200 mb-1">
                {documente.length === 0
                  ? "Creați documente pe categorii pentru a colabora cu echipa"
                  : "Niciun document nu corespunde căutării"}
              </p>
              <p className="text-sm text-slate-500">
                {documente.length === 0
                  ? "Facturi, contracte, fișe tehnice. Editați. Discutați. Partajați."
                  : "Încercați alt termen în câmpul de căutare Fișă tehnică."}
              </p>
            </div>
          ) : viewMode === "list" ? (
            <Table>
              <TableHeader>
                <TableRow className="border-[#1f2937] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium w-[40px]"></TableHead>
                  <TableHead className="text-slate-400 font-medium">Nume document</TableHead>
                  <TableHead className="text-slate-400 font-medium">Categorie</TableHead>
                  <TableHead className="text-slate-400 font-medium">Data încărcării</TableHead>
                  <TableHead className="text-slate-400 font-medium">Încărcat de</TableHead>
                  {isAdmin && <TableHead className="text-slate-400 font-medium w-[100px]">Acțiuni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {documenteAfisate.map((doc) => (
                  <TableRow key={doc.id} className="border-[#1f2937] hover:bg-[#1f2937]/50">
                    <TableCell className="w-[40px]">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">
                      <a
                        href={doc.objectPath.startsWith("/") ? `${window.location.origin}${doc.objectPath}` : doc.objectPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#fbbf24] hover:underline flex items-center gap-1"
                      >
                        {doc.nume}
                        {doc.fileName && (
                          <span className="text-xs text-slate-500">({doc.fileName})</span>
                        )}
                      </a>
                    </TableCell>
                    <TableCell className="text-slate-300">{getCategoryLabel(doc.categorie)}</TableCell>
                    <TableCell className="text-slate-300">
                      {format(parseISO(doc.uploadedAt), "dd MMM yyyy, HH:mm", { locale: ro })}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {doc.uploadedByFirstName != null
                        ? `${doc.uploadedByFirstName} ${doc.uploadedByLastName ?? ""}`
                        : "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => deleteMutation.mutate(doc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <a
                            href={doc.objectPath.startsWith("/") ? `${window.location.origin}${doc.objectPath}` : doc.objectPath}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#fbbf24]">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {documenteAfisate.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "rounded-xl border p-4 bg-[#111827]/50 border-[#1f2937]",
                    viewMode === "tile" && "flex flex-col"
                  )}
                >
                  <FileText className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="font-medium text-slate-200 truncate" title={doc.nume}>{doc.nume}</p>
                  <p className="text-xs text-slate-500 mt-1">{getCategoryLabel(doc.categorie)}</p>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(doc.uploadedAt), "dd.MM.yyyy", { locale: ro })}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={doc.objectPath.startsWith("/") ? `${window.location.origin}${doc.objectPath}` : doc.objectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-[#1f2937] text-slate-300">
                        <Download className="h-3 w-3 mr-1" />
                        Deschide
                      </Button>
                    </a>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteMutation.mutate(doc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal încărcare */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="bg-[#111827] border-[#1f2937] text-slate-200">
          <DialogHeader>
            <DialogTitle>Adăugare document</DialogTitle>
            <DialogDescription>
              Categoria: {getCategoryLabel(selectedCategory)}. Încărcați fișierul și dați un nume (despre ce e documentul).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Nume document (despre ce e)</Label>
              <Input
                value={numeDocument}
                onChange={(e) => setNumeDocument(e.target.value)}
                placeholder="ex: Contract furnizor X, Factură martie 2026"
                className="bg-[#0a0c0f] border-[#1f2937]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fișier</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="bg-[#0a0c0f] border-[#1f2937]"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)} className="border-[#1f2937]">
                Anulare
              </Button>
              <Button type="submit" disabled={uploading} className="bg-[#fbbf24] text-black hover:bg-[#f59e0b]">
                {uploading ? "Se încarcă..." : "Încarcă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
