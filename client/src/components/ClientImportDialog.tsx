import { useState, useCallback, useMemo } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { SafeUser } from "@shared/schema";

interface ClientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  agents: SafeUser[];
  isAdmin: boolean;
  currentUserId?: string;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "results";

interface ImportResult {
  success: number;
  errors: number;
  skipped: number;
  errorDetails: { row: number; error: string; data: Record<string, string> }[];
}

const CLIENT_FIELDS = [
  { key: "nume", label: "Nume *", required: true },
  { key: "telefon", label: "Telefon", required: false },
  { key: "email", label: "Email", required: false },
  { key: "localitate", label: "Localitate/Adresă", required: false },
  { key: "judet", label: "Județ", required: false },
  { key: "dataOfertarii", label: "Data Ofertării", required: false },
  { key: "sursa", label: "Sursa", required: false },
  { key: "mlRulouProd", label: "ML Rulou", required: false },
  { key: "valoareOferta", label: "Valoare Ofertă", required: false },
  { key: "categorieProdus", label: "Categorie Produs", required: false },
  { key: "brand", label: "Brand", required: false },
  { key: "model", label: "Model", required: false },
  { key: "suprafataMp", label: "Suprafață MP", required: false },
  { key: "culoare", label: "Culoare", required: false },
  { key: "grosime", label: "Grosime", required: false },
  { key: "finisaj", label: "Finisaj", required: false },
  { key: "smartDripstop", label: "Smart Drip Stop", required: false },
  { key: "dataRevenire1", label: "Data Revenire 1", required: false },
  { key: "comentariuObservatii1", label: "Comentariu 1", required: false },
  { key: "dataRevenire2", label: "Data Revenire 2", required: false },
  { key: "comentariuObservatii2", label: "Comentariu 2", required: false },
  { key: "stadiuOferta", label: "Stadiu Ofertă", required: false },
  { key: "dataVanzarii", label: "Data Vânzării", required: false },
  { key: "stadiuComanda", label: "Stadiu Comandă", required: false },
  { key: "dataLivrarii", label: "Data Livrării", required: false },
  { key: "incasat", label: "Încasat", required: false },
  { key: "procentComision", label: "Procent Comision", required: false },
  { key: "observatiiClient", label: "Observații", required: false },
  { key: "dataAdaugare", label: "Data Adăugare", required: false },
];

const COLUMN_MAPPINGS: Record<string, string[]> = {
  nume: ["nume", "name", "client", "denumire", "nume client"],
  telefon: ["telefon", "phone", "tel", "numar telefon", "nr telefon", "mobil"],
  email: ["email", "e-mail", "mail", "adresa email"],
  localitate: ["localitate", "oras", "city", "localitatea", "loc", "adresa"],
  judet: ["judet", "county", "regiune", "jud"],
  dataOfertarii: ["data ofertarii", "data oferta", "data ofertare"],
  sursa: ["sursa", "source", "provenienta", "canal", "sursa de provenienta"],
  mlRulouProd: ["ml rulou", "ml", "metri liniari"],
  valoareOferta: ["valoare", "value", "pret", "suma", "valoare oferta", "total"],
  categorieProdus: ["categorie", "produs", "category", "tip produs", "categorie produs"],
  brand: ["brand", "marca", "producator"],
  model: ["model", "tip", "varianta"],
  suprafataMp: ["suprafata", "suprafata mp", "mp", "metri patrati"],
  culoare: ["culoare", "color", "ral"],
  grosime: ["grosime", "thickness"],
  finisaj: ["finisaj", "finish"],
  smartDripstop: ["smart drip", "dripstop", "drip stop", "smart dripstop"],
  dataRevenire1: ["data revenire", "data de revenire", "revenire"],
  comentariuObservatii1: ["comentariu", "observatii", "notes", "comentarii", "detalii", "obs", "observatii 1"],
  dataRevenire2: ["data revenire 2", "revenire 2"],
  comentariuObservatii2: ["observatii 2", "comentariu 2", "comentarii 2"],
  stadiuOferta: ["stadiu oferta", "stadiu", "status", "stare"],
  dataVanzarii: ["data vanzarii", "data vanzare", "vandut la", "data vandut"],
  stadiuComanda: ["stadiu comanda", "status comanda"],
  dataLivrarii: ["data livrarii", "data livrare", "livrat la", "data livrat"],
  incasat: ["incasat", "platit", "achitat"],
  procentComision: ["procent comision", "comision", "commission", "com", "procent"],
  observatiiClient: ["observatii", "notes", "comentarii", "obs"],
  dataAdaugare: ["data adaugare", "data creare", "created at"],
};

export function ClientImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  agents,
  isAdmin,
  currentUserId,
}: ClientImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string>(isAdmin ? "unassigned" : (currentUserId || ""));
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "create">("create");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetDialog = useCallback(() => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setSelectedAgentId(isAdmin ? "unassigned" : (currentUserId || ""));
    setDuplicateStrategy("skip");
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, [isAdmin, currentUserId]);

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const autoMapColumns = useCallback((csvHeaders: string[]) => {
    const mapping: Record<string, string> = {};

    for (const field of CLIENT_FIELDS) {
      const possibleNames = COLUMN_MAPPINGS[field.key] || [field.key];
      const matchingHeader = csvHeaders.find(header =>
        possibleNames.some(name =>
          header.toLowerCase().trim().includes(name.toLowerCase())
        )
      );
      if (matchingHeader) {
        mapping[field.key] = matchingHeader;
      }
    }

    return mapping;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Te rog să încarci un fișier CSV");
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            console.warn("CSV parse warnings:", results.errors);
            if (!results.data || results.data.length === 0) {
              toast.error("Eroare la citirea fișierului CSV (format invalid)");
              return;
            }
          }

          const rawData = results.data as Record<string, string>[];
          const validData = rawData.filter(row => Object.values(row).some(val => val && val.trim() !== ""));

          if (validData.length === 0) {
            toast.error("Fișierul CSV nu conține date");
            return;
          }

          const rawHeaders = results.meta.fields || (validData.length > 0 ? Object.keys(validData[0]) : []);
          const csvHeaders = rawHeaders.filter(h => h && h.trim() !== "");

          if (csvHeaders.length === 0) {
            toast.error("Nu s-au putut identifica coloanele CSV");
            return;
          }

          setHeaders(csvHeaders);
          setParsedData(validData);

          const autoMapping = autoMapColumns(csvHeaders);
          setColumnMapping(autoMapping);

          toast.success(`${validData.length} rânduri găsite`);
          setStep("mapping");
        } catch (e) {
          console.error("Error processing CSV:", e);
          toast.error("A apărut o eroare la procesarea acestui fișier");
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Eroare la citirea fișierului CSV");
      },
    });
  };

  const updateMapping = (fieldKey: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn === "__skip__" ? "" : csvColumn,
    }));
  };

  const previewData = useMemo(() => {
    return parsedData.slice(0, 5).map((row, index) => {
      const mappedRow: Record<string, string | number> = { index: index + 1 };
      for (const field of CLIENT_FIELDS) {
        const csvColumn = columnMapping[field.key];
        mappedRow[field.key] = csvColumn ? (row[csvColumn] || "") : "";
      }
      return mappedRow;
    });
  }, [parsedData, columnMapping]);

  const canProceedToPreview = useMemo(() => {
    const requiredFields = CLIENT_FIELDS.filter(f => f.required);
    return requiredFields.every(f => columnMapping[f.key]);
  }, [columnMapping]);

  const handleImport = async () => {
    if (!canProceedToPreview) {
      toast.error("Te rog să mapezi toate câmpurile obligatorii");
      return;
    }

    setStep("importing");
    setImporting(true);
    setImportProgress(0);

    try {
      const rows = parsedData.map(row => {
        const mappedRow: Record<string, string> = {};
        for (const field of CLIENT_FIELDS) {
          const csvColumn = columnMapping[field.key];
          if (csvColumn && row[csvColumn]) {
            mappedRow[field.key] = row[csvColumn].trim();
          }
        }
        return mappedRow;
      });

      const response = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          agentId: selectedAgentId === "unassigned" ? undefined : (selectedAgentId || undefined),
          duplicateStrategy,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Eroare la import");
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep("results");

      if (result.success > 0) {
        toast.success(`${result.success} clienți importați cu succes`);
        onImportComplete();
      }
      if (result.errors > 0) {
        toast.warning(`${result.errors} rânduri cu erori`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Eroare la import");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Clienți din CSV
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Încarcă un fișier CSV cu datele clienților"}
            {step === "mapping" && "Mapează coloanele din CSV la câmpurile din aplicație"}
            {step === "preview" && "Verifică datele înainte de import"}
            {step === "importing" && "Se importă datele..."}
            {step === "results" && "Import finalizat"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg min-h-[200px]">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Încarcă fișierul CSV</p>
              <p className="text-sm text-muted-foreground mb-4">
                Fișierul trebuie să conțină coloanele: Nume, Telefon (obligatorii)
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="max-w-xs"
                data-testid="input-import-file"
              />
              <Button
                variant="link"
                className="mt-4 text-sm text-blue-600"
                onClick={() => {
                  const headers = [
                    "Nume Client", "Telefon", "Email", "Localitate", "Judet", "Sursa",
                    "Categorie Produs", "Brand", "Model", "Culoare", "Valoare Oferta",
                    "Stadiu Oferta", "Data Vanzarii", "Data Livrarii", "Incasat",
                    "Comision", "Stadiu Comanda", "Observatii", "Data Adaugare"
                  ];

                  const rows = [
                    "Popescu Ioan,0722123456,popescu@test.ro,Sector 1,București,FACEBOOK,GARD,METALLIC_GROUP,SIPCA_GARD,RAL_9005,1500,NOUA,,,NU,,Interesat,Client serios,2025-01-10",
                    "Maria Ionescu,0733987654,maria@test.ro,Voluntari,Ilfov,RECOMANDARE,ACOPERIS,BILKA,BALCANIC,RAL_7016,5000,TRIMISA,,,NU,,Suna pt detalii,Vrea montaj,2025-01-12",
                    "SC Constructii SRL,0744555666,office@construct.ro,Cluj-Napoca,Cluj,SITE,RULOURI_EXTERIOARE,SMART,ALTELE,RAL_8017,12500,VANDUT,2025-01-15,2025-01-25,DA,2,LIVRAT,Partener vechi,2025-01-05"
                  ];

                  const csvContent = [headers.join(","), ...rows].join("\n");
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.setAttribute('download', 'model_import_clienti_personalizat.csv');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Descarcă model CSV
              </Button>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CLIENT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {field.required && (
                        <Badge variant="destructive" className="text-xs">Obligatoriu</Badge>
                      )}
                    </Label>
                    <Select
                      value={columnMapping[field.key] || "__skip__"}
                      onValueChange={(value) => updateMapping(field.key, value)}
                    >
                      <SelectTrigger data-testid={`select-mapping-${field.key}`}>
                        <SelectValue placeholder="Selectează coloana" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">-- Nu mapa --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Atribuie toți clienții la agentul:</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger data-testid="select-import-agent">
                      <SelectValue placeholder="Selectează agent (opțional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">-- Neatribuit --</SelectItem>
                      {agents.filter(a => a.role === "AGENT").map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label>Dacă telefonul există deja:</Label>
                <Select value={duplicateStrategy} onValueChange={(v) => setDuplicateStrategy(v as "skip" | "update" | "create")}>
                  <SelectTrigger data-testid="select-duplicate-strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Creează intrare nouă (permite duplicate)</SelectItem>
                    <SelectItem value="skip">Sari peste (nu importa)</SelectItem>
                    <SelectItem value="update">Actualizează datele existente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Primele 5 rânduri din {parsedData.length} total
                </p>
                <Badge variant="outline">{parsedData.length} clienți de importat</Badge>
              </div>
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {CLIENT_FIELDS.slice(0, 6).map((field) => (
                        <TableHead key={field.key}>{field.label.replace(" *", "")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.index}>
                        <TableCell className="font-medium">{row.index}</TableCell>
                        {CLIENT_FIELDS.slice(0, 6).map((field) => (
                          <TableCell key={field.key} className="max-w-[150px] truncate">
                            {row[field.key] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
              <div className="w-full max-w-md space-y-4">
                <Progress value={importProgress} className="h-3" />
                <p className="text-center text-muted-foreground">
                  Se importă clienții... Vă rugăm așteptați.
                </p>
              </div>
            </div>
          )}

          {step === "results" && importResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                  <p className="text-sm text-green-600">Importați</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{importResult.skipped}</p>
                  <p className="text-sm text-yellow-600">Săriți (duplicate)</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
                  <X className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{importResult.errors}</p>
                  <p className="text-sm text-red-600">Erori</p>
                </div>
              </div>

              {importResult.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-red-600">Detalii erori (primele 10):</p>
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    {importResult.errorDetails.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-sm py-1 border-b last:border-0">
                        <span className="font-medium">Rând {err.row}:</span> {err.error}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Anulează
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!canProceedToPreview}
                data-testid="button-continue-preview"
              >
                Previzualizare
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                data-testid="button-start-import"
              >
                Importă {parsedData.length} clienți
              </Button>
            </>
          )}

          {step === "results" && (
            <Button onClick={handleClose} data-testid="button-close-import">
              Închide
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
