import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth";
import { Download, Loader2 } from "lucide-react";
import { generateOfertaPdf, type OfertaPdfData } from "@/lib/ofertaPdf";
import { uploadFileForClient } from "@/components/ObjectUploader";
import type { OfertaFormSnapshot } from "@shared/schema";
import { toast } from "sonner";

const MODELS = [
  "MX 25",
  "MX 60",
  "MX 15",
  "MX 25 DUO",
  "MX 60 DUO",
  "MX 15 DUO",
  "MC 105 CASETAT (STAS 3.5cm)",
  "MC 75 CASETAT (STAS 2.5cm)",
  "MC 105 CASETAT (1.5cm)",
  "MC 75 CASETAT (1.5cm)",
] as const;

const GROSIMI = ["0.5mm DV", "0.6mm DV"] as const;

// Lista prețuri (lei/mp) per model + grosime
const LISTA_PRET: Record<string, Record<string, number>> = {
  "MX 25": { "0.5mm DV": 250, "0.6mm DV": 300 },
  "MX 25 DUO": { "0.5mm DV": 400, "0.6mm DV": 460 },
  "MX 60": { "0.5mm DV": 265, "0.6mm DV": 320 },
  "MX 60 DUO": { "0.5mm DV": 425, "0.6mm DV": 480 },
  "MX 15": { "0.5mm DV": 320, "0.6mm DV": 350 },
  "MX 15 DUO": { "0.5mm DV": 450, "0.6mm DV": 520 },
  "MC 105 CASETAT (STAS 3.5cm)": { "0.5mm DV": 360, "0.6mm DV": 400 },
  "MC 75 CASETAT (STAS 2.5cm)": { "0.5mm DV": 380, "0.6mm DV": 420 },
  "MC 105 CASETAT (1.5cm)": { "0.5mm DV": 410, "0.6mm DV": 450 },
  "MC 75 CASETAT (1.5cm)": { "0.5mm DV": 430, "0.6mm DV": 470 },
};

const ACCESORII_INITIAL = [
  { denumire: "SURUBURI METAL 4.8x1.9 *250buc", um: "cutie", pretBuc: 85 },
  { denumire: "DIBLURI 8x60", um: "buc", pretBuc: 5 },
  { denumire: "POPNITURI COLORATE 25 buc", um: "pungă", pretBuc: 25 },
  { denumire: "SURUBURI CAP PLAT 50 buc", um: "pungă", pretBuc: 20 },
  { denumire: "FOARFECA PENTRU TABLA", um: "buc", pretBuc: 300 },
  { denumire: "PISTOL POPNITURI", um: "buc", pretBuc: 3000 },
  { denumire: "MARKER RETUS", um: "buc", pretBuc: 89 },
  { denumire: "ZIDARIE - ELEMENT FUNDATIE 40x20x16", um: "buc", pretBuc: 25 },
  { denumire: "ZIDARIE - ELEMENT STALP 20x20x16", um: "buc", pretBuc: 18 },
  { denumire: "ZIDARIE - CAPAC STALP 47x27x5,5", um: "buc", pretBuc: 43 },
  { denumire: "CADRU -  POARTA PIETONALA + ACCESORII  - LUNGIME ≤ 1m", um: "buc", pretBuc: 1200 },
  { denumire: "CADRU - POARTA BATANTA + ACCESORII - LUNGIME ≤ 4m", um: "buc", pretBuc: 4800 },
  { denumire: "CADRU - POARTA CULISANTA + ACCESORII - LUNGIME ≤ 4m", um: "buc", pretBuc: 5000 },
  { denumire: "CADRU - POARTA CULISANTA + ACCESORII - LUNGIMEE ≤ 5m", um: "buc", pretBuc: 6000 },
  { denumire: "CADRU - POARTA CULISANTA + ACCESORII - LUNGIME ≤ 6m", um: "buc", pretBuc: 7200 },
  { denumire: "KIT SISTEM AUTOPORTANT", um: "buc", pretBuc: 3000 },
  { denumire: "STALP METALIC RECTANGULARA 60x40 - LUNGIME ≤ 3m", um: "buc", pretBuc: 200 },
  { denumire: "STALP METALIC RECTANGULARA 60x60 - LUNGIME ≤ 3m", um: "buc", pretBuc: 250 },
  { denumire: "STALP METALIC RECTANGULARA 80x80 - LUNGIME ≤ 3m", um: "buc", pretBuc: 300 },
  { denumire: "STALP METALIC RECTANGULARA 100x100 - LUNGIME ≤ 3m", um: "buc", pretBuc: 350 },
  { denumire: "SERVICIU VOPSIRE ELECTROSTATIC ( SET PORTI )", um: "set", pretBuc: 1400 },
  { denumire: "SERVICIU VOPSIRE ELECTROSTATIC ( STALP )", um: "buc", pretBuc: 140 },
  { denumire: "TABLA PLANA PRELUCRATA ( ELEMENT SPECIAL )", um: "buc", pretBuc: 160 },
  { denumire: "MANOPERA - FUNDATIE", um: "ml", pretBuc: 100 },
  { denumire: "MANOPERA - ZIDARIE BOLTARI", um: "mp / ml", pretBuc: 100 },
  { denumire: "MANOPERA - PANOURI - H  ≤ 1.2m", um: "buc", pretBuc: 180 },
  { denumire: "MANOPERA - PANOURI - H 1.2m ⇔ 1.8m", um: "buc", pretBuc: 240 },
  { denumire: "MANOPERA - PANOURI - H > 1.8m", um: "buc", pretBuc: 300 },
  { denumire: "MANOPERA - MONTAJ ELEMENTE SPECIALE", um: "ml", pretBuc: 25 },
  { denumire: "YALA ELECTROMAGNETICA POARTA PIETONALA", um: "buc", pretBuc: 800 },
  { denumire: "AUTOMATIZARE POARTA BATANTA", um: "buc", pretBuc: 3000 },
  { denumire: "AUTOMATIZARE POARTA CULISANTA", um: "buc", pretBuc: 3500 },
];

const CULORI = [
  "RAL 9002 ALB LUCIOS",
  "RAL 7016 GRI MAT",
  "RAL 3005 VISINIU BRILIANT",
  "RAL 9005 NEGRU MAT",
  "RAL 8017 MARO LUCIOS",
  "RAL 8019 MARO BRUN MAT",
  "RAL 8019 MARO BRUN BRILIANT",
  "MAHON",
  "STEJAR AURIU",
  "MESTEACAN",
  "GRAPHITE",
];

/** Mapare grosime din fișa client → Ofertare */
function mapClientGrosime(grosime: string | null | undefined): string {
  if (!grosime) return "";
  if (grosime === "0.50" || grosime.startsWith("0.5")) return "0.5mm DV";
  if (grosime === "0.60" || grosime.startsWith("0.6")) return "0.6mm DV";
  return GROSIMI.find((g) => g === grosime) || "";
}

/** Mapare culoare RAL_* din client → eticheta din Ofertare */
function mapClientCuloare(culoare: string | null | undefined): string {
  if (!culoare) return "";
  if ((CULORI as readonly string[]).includes(culoare)) return culoare;
  const code = culoare.replace(/_/g, " ").toUpperCase();
  const exact = CULORI.find((c) => c.toUpperCase() === code);
  if (exact) return exact;
  // Match pe prefix doar dacă e egal sau urmat de spațiu (evită RAL_8019 → primul 8019 din listă)
  const match = CULORI.find((c) => {
    const u = c.toUpperCase();
    return u === code || u.startsWith(code + " ");
  });
  return match || "";
}

function mapClientModel(model: string | null | undefined, brand?: string | null): string {
  if (model) {
    const exact = MODELS.find((m) => m === model || m.toLowerCase() === model.toLowerCase());
    if (exact) return exact;
    const partial = MODELS.find(
      (m) =>
        m.toLowerCase().includes(model.toLowerCase()) ||
        model.toLowerCase().includes(m.toLowerCase()),
    );
    if (partial) return partial;
  }
  if (brand) {
    const byBrand = MODELS.find((m) => m.toLowerCase().startsWith(brand.toLowerCase()));
    if (byBrand) return byBrand;
  }
  return "";
}

const PANOURI_DEFAULT = [
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
];

export default function Ofertare() {
  const { user, isAdmin } = useAuth();
  const isRazvan =
    !!user &&
    (user.email?.toLowerCase().includes("razvan") ||
      user.firstName?.toLowerCase().includes("razvan"));
  /** Răzvan (și adminii) pot edita prețurile de pe Accesorii auxiliare */
  const canEditAccesoriiPrices = isRazvan || isAdmin;
  const prefillDone = useRef(false);
  const fromClientIdRef = useRef<string | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);

  const [client, setClient] = useState("");
  const [cnpCui, setCnpCui] = useState("");
  const [telefon, setTelefon] = useState("");
  const [strada, setStrada] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [judet, setJudet] = useState("");
  const [culoare, setCuloare] = useState("");
  const [modelGard, setModelGard] = useState<string>("");
  const [grosime, setGrosime] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [panouri, setPanouri] = useState<{ lungime: number; inaltime: number; nrPanouri: number }[]>(PANOURI_DEFAULT);
  const [accesorii, setAccesorii] = useState<{ denumire: string; um: string; pretBuc: number; cant: number }[]>(
    ACCESORII_INITIAL.map((a) => ({ ...a, cant: 0 }))
  );

  const applyFormSnapshot = (snap: OfertaFormSnapshot) => {
    setClient(snap.client || "");
    setCnpCui(snap.cnpCui || "");
    setTelefon(snap.telefon || "");
    setStrada(snap.strada || "");
    setLocalitate(snap.localitate || "");
    setJudet(snap.judet || "");
    setCuloare(snap.culoare || "");
    setModelGard(snap.modelGard || "");
    setGrosime(snap.grosime || "");
    setDiscountPercent(typeof snap.discountPercent === "number" ? snap.discountPercent : 0);
    if (Array.isArray(snap.panouri) && snap.panouri.length > 0) {
      const padded = [...snap.panouri];
      while (padded.length < 5) padded.push({ lungime: 0, inaltime: 0, nrPanouri: 0 });
      setPanouri(padded.slice(0, Math.max(5, snap.panouri.length)));
    }
    if (Array.isArray(snap.accesorii) && snap.accesorii.length > 0) {
      setAccesorii(snap.accesorii.map((a) => ({ ...a })));
    }
  };

  // Prefill din /clienti?fromClient=...
  useEffect(() => {
    if (prefillDone.current) return;
    const params = new URLSearchParams(window.location.search);
    const fromClientId = params.get("fromClient");
    if (!fromClientId) return;
    prefillDone.current = true;
    fromClientIdRef.current = fromClientId;

    (async () => {
      try {
        const res = await fetch(`/api/clients/${fromClientId}`, { credentials: "include" });
        if (!res.ok) {
          toast.error("Nu s-au putut încărca datele clientului");
          return;
        }
        const c = await res.json();
        const saved = c.ofertaFormData as OfertaFormSnapshot | null | undefined;
        if (saved && typeof saved === "object") {
          applyFormSnapshot(saved);
          toast.success(`Ofertă anterioară preluată pentru „${c.nume || "client"}"`);
        } else {
          // Prima ofertă: contact (fără sursă / agent) + produs
          setClient(c.nume || "");
          setTelefon(c.telefon || "");
          setLocalitate(c.localitate || "");
          setJudet(c.judet || "");
          setCuloare(mapClientCuloare(c.culoare));
          setModelGard(mapClientModel(c.model, c.brand));
          setGrosime(mapClientGrosime(c.grosime));
          toast.success(`Date preluate de la „${c.nume || "client"}"`);
        }
      } catch {
        toast.error("Eroare la încărcarea clientului pentru ofertare");
      }
    })();
  }, []);

  const panouriCuMp = useMemo(() => {
    return panouri.map((p) => {
      const mp = p.lungime * p.inaltime * p.nrPanouri;
      return { ...p, mp };
    });
  }, [panouri]);

  const totalMp = useMemo(() => panouriCuMp.reduce((s, p) => s + p.mp, 0), [panouriCuMp]);

  const listPrice = useMemo(() => {
    if (!modelGard || !grosime) return 0;
    const key = MODELS.find((m) => m === modelGard) ?? modelGard;
    return LISTA_PRET[key]?.[grosime] ?? 0;
  }, [modelGard, grosime]);

  const pretPerMp = useMemo(() => {
    const discount = discountPercent / 100;
    return listPrice * (1 - discount);
  }, [listPrice, discountPercent]);

  const totalValoareGard = useMemo(() => totalMp * pretPerMp, [totalMp, pretPerMp]);

  const accesoriiCuTotal = useMemo(() => {
    return accesorii.map((a) => ({
      ...a,
      total: a.cant * a.pretBuc,
    }));
  }, [accesorii]);

  const totalValoareAccesorii = useMemo(
    () => accesoriiCuTotal.reduce((s, a) => s + a.total, 0),
    [accesoriiCuTotal]
  );

  const totalGeneral = useMemo(
    () => totalValoareGard + totalValoareAccesorii,
    [totalValoareGard, totalValoareAccesorii]
  );

  const updatePanou = (index: number, field: "lungime" | "inaltime" | "nrPanouri", value: number) => {
    setPanouri((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateAccesoriuCant = (index: number, cant: number) => {
    setAccesorii((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], cant };
      return next;
    });
  };

  const updateAccesoriuPret = (index: number, pretBuc: number) => {
    setAccesorii((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], pretBuc };
      return next;
    });
  };

  const handleDownloadPdf = async () => {
    const agentName = user ? `${user.firstName} ${user.lastName}` : "Agent";
    const data: OfertaPdfData = {
      agentName,
      agentTitle: isRazvan ? "Agent Vanzari" : "Director Vanzari",
      agentPhone: isRazvan ? "0731954653" : "0760 259 460",
      agentEmail: isRazvan
        ? "razvan@metallicroof.ro"
        : "dragos.frangache@metallicroof.ro",
      agentAddress: "Bld Aurel Vlaicu 181, Constanta, Romania",
      client: client || "—",
      cnpCui: cnpCui || "—",
      telefon: telefon || "—",
      strada: strada || "—",
      localitate: localitate || "—",
      judet: judet || "—",
      culoare: culoare || "—",
      modelGard: modelGard || "—",
      grosime: grosime || "—",
      discountPercent,
      panouri: panouriCuMp.filter((p) => p.mp > 0),
      accesorii: accesoriiCuTotal.filter((a) => a.cant > 0).map((a) => ({ ...a, denumire: a.denumire })),
      totalMp,
      totalValoareGard,
      totalValoareAccesorii,
      totalGeneral,
    };

    const linkedClientId = fromClientIdRef.current;
    setSavingPdf(true);
    try {
      const blob = await generateOfertaPdf(data);

      if (linkedClientId) {
        const filename = `Oferta_${(client || "Client").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
        const file = new File([blob], filename, { type: "application/pdf" });
        await uploadFileForClient(file, linkedClientId, "oferta1");

        const snapshot: OfertaFormSnapshot = {
          client,
          cnpCui,
          telefon,
          strada,
          localitate,
          judet,
          culoare,
          modelGard,
          grosime,
          discountPercent,
          panouri,
          accesorii,
        };
        const patchRes = await fetch(`/api/clients/${linkedClientId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ofertaFormData: snapshot,
            valoareOferta: totalValoareGard.toFixed(2),
            dataOfertarii: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          throw new Error(err.message || "Nu s-a putut salva formularul ofertei pe fișa clientului");
        }
        toast.success("PDF descărcat și salvat la Fișier Ofertă 1 pe fișa clientului");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Eroare la generarea / salvarea ofertei");
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofertare</h1>
        <p className="text-slate-400">Completează datele clientului și configurația pentru a genera oferta PDF.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OFERTA / COMANDA CLIENT</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nume client" />
              </div>
              <div className="space-y-2">
                <Label>CNP / CUI</Label>
                <Input value={cnpCui} onChange={(e) => setCnpCui(e.target.value)} placeholder="CNP sau CUI" />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="Telefon" />
              </div>
              <div className="space-y-2">
                <Label>Strada</Label>
                <Input value={strada} onChange={(e) => setStrada(e.target.value)} placeholder="Strada, nr." />
              </div>
              <div className="space-y-2">
                <Label>Localitate</Label>
                <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} placeholder="Localitate" />
              </div>
              <div className="space-y-2">
                <Label>Județ</Label>
                <Input value={judet} onChange={(e) => setJudet(e.target.value)} placeholder="Județ" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>!!! Culoare</Label>
                <Select value={culoare} onValueChange={setCuloare}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alege culoarea" />
                  </SelectTrigger>
                  <SelectContent>
                    {CULORI.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurare gard</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ALEGE MODEL</Label>
                <Select value={modelGard} onValueChange={setModelGard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Model gard" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ALEGE GROSIME</Label>
                <Select value={grosime} onValueChange={setGrosime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grosime" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROSIMI.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount % (20% = preț achiziție)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            {listPrice > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                Listă: {listPrice} lei/mp → Preț/mp (după discount): {pretPerMp.toFixed(2)} lei
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desfășurator panouri</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Lungime (L)</th>
                    <th className="text-left p-2">Înălțime (H)</th>
                    <th className="text-left p-2">Nr panouri</th>
                    <th className="text-left p-2">MP</th>
                  </tr>
                </thead>
                <tbody>
                  {panouri.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24 h-8"
                          value={p.lungime || ""}
                          onChange={(e) => updatePanou(i, "lungime", Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24 h-8"
                          value={p.inaltime || ""}
                          onChange={(e) => updatePanou(i, "inaltime", Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 h-8"
                          value={p.nrPanouri || ""}
                          onChange={(e) => updatePanou(i, "nrPanouri", Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2 font-medium">{panouriCuMp[i].mp > 0 ? panouriCuMp[i].mp.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-medium">TOTAL MP: {totalMp.toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesorii auxiliare</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Denumire</th>
                    <th className="text-left p-2">U.M.</th>
                    <th className="text-left p-2">Cant.</th>
                    <th className="text-left p-2">Preț/buc</th>
                    <th className="text-left p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {accesorii.map((a, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{a.denumire}</td>
                      <td className="p-2">{a.um}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 h-8"
                          value={a.cant || ""}
                          onChange={(e) => updateAccesoriuCant(i, Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2">
                        {canEditAccesoriiPrices ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-24 h-8"
                              value={a.pretBuc || ""}
                              onChange={(e) =>
                                updateAccesoriuPret(i, Number(e.target.value) || 0)
                              }
                              data-testid={`input-accesoriu-pret-${i}`}
                            />
                            <span className="text-slate-400 text-xs">lei</span>
                          </div>
                        ) : (
                          <span>{a.pretBuc} lei</span>
                        )}
                      </td>
                      <td className="p-2 font-medium">{accesoriiCuTotal[i].total > 0 ? `${accesoriiCuTotal[i].total.toFixed(2)} lei` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-medium">TOTAL VALOARE ACCESORII: {totalValoareAccesorii.toFixed(2)} lei</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {discountPercent > 0 ? (
                <p className="text-sm text-slate-400">Discount: {discountPercent}% = preț achiziție</p>
              ) : (
                <p className="text-sm text-slate-400">Fără discount</p>
              )}
              <p className="text-xl font-bold">TOTAL GENERAL: {totalGeneral.toFixed(2)} lei</p>
            </div>
            <Button
              onClick={handleDownloadPdf}
              size="lg"
              className="gap-2"
              disabled={savingPdf}
              data-testid="button-download-pdf"
            >
              {savingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {savingPdf ? "Se salvează..." : "Descarcă PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
