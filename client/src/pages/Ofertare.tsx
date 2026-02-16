import { useState, useMemo } from "react";
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
import { Download } from "lucide-react";
import { generateOfertaPdf, type OfertaPdfData } from "@/lib/ofertaPdf";

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
  { denumire: "DIBLURI 8x60", um: "buc", pretBuc: 3 },
  { denumire: "POPNITURI COLORATE 25 buc", um: "pungă", pretBuc: 25 },
  { denumire: "SURUBURI CAP PLAT 50 buc", um: "pungă", pretBuc: 20 },
  { denumire: "FOARFECA PENTRU TABLA", um: "buc", pretBuc: 300 },
  { denumire: "PISTOL POPNITURI", um: "buc", pretBuc: 3000 },
  { denumire: "VOSPEA", um: "litri", pretBuc: 150 },
  { denumire: "ELEMENT FUNDATIE 40x20x16", um: "buc", pretBuc: 25 },
  { denumire: "ELEMENT STALP 20x20x16", um: "buc", pretBuc: 18 },
  { denumire: "CAPAC STALP 47x27x5,5", um: "buc", pretBuc: 43 },
  { denumire: "POARTA PIETONALA", um: "buc", pretBuc: 1200 },
  { denumire: "PORTI BATANTE", um: "buc", pretBuc: 4000 },
  { denumire: "POARTA CULISANTA", um: "buc", pretBuc: 4800 },
  { denumire: "TABLA PLANA PRELUCRATA", um: "mp", pretBuc: 160 },
];

const CULORI = [
  "RAL 9002 ALB LUCIOS",
  "RAL 7016 GRI MAT",
  "RAL 3005 VISINIU BRILIANT",
  "RAL 9005 NEGRU MAT",
  "RAL 8017 MARO LUCIOS",
  "MAHON",
  "STEJAR AURIU",
  "MESTEACAN",
  "GRAPHITE",
];

const PANOURI_DEFAULT = [
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
  { lungime: 0, inaltime: 0, nrPanouri: 0 },
];

export default function Ofertare() {
  const { user } = useAuth();
  const [client, setClient] = useState("");
  const [cnpCui, setCnpCui] = useState("");
  const [telefon, setTelefon] = useState("");
  const [strada, setStrada] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [judet, setJudet] = useState("");
  const [culoare, setCuloare] = useState("");
  const [modelGard, setModelGard] = useState<string>("");
  const [grosime, setGrosime] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [panouri, setPanouri] = useState<{ lungime: number; inaltime: number; nrPanouri: number }[]>(PANOURI_DEFAULT);
  const [accesorii, setAccesorii] = useState<{ denumire: string; um: string; pretBuc: number; cant: number }[]>(
    ACCESORII_INITIAL.map((a) => ({ ...a, cant: 0 }))
  );

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

  const handleDownloadPdf = () => {
    const agentName = user ? `${user.firstName} ${user.lastName}` : "Agent";
    const data: OfertaPdfData = {
      agentName,
      agentTitle: "Director Vanzari",
      agentPhone: "0760 259 460",
      agentEmail: "dragos.frangache@metallicroof.ro",
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
    generateOfertaPdf(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofertare</h1>
        <p className="text-muted-foreground">Completează datele clientului și configurația pentru a genera oferta PDF.</p>
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
              <p className="mt-2 text-sm text-muted-foreground">
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
                      <td className="p-2">{a.pretBuc} lei</td>
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
              <p className="text-sm text-muted-foreground">Discount: {discountPercent}% = preț achiziție</p>
              <p className="text-xl font-bold">TOTAL GENERAL: {totalGeneral.toFixed(2)} lei</p>
            </div>
            <Button onClick={handleDownloadPdf} size="lg" className="gap-2" data-testid="button-download-pdf">
              <Download className="h-5 w-5" />
              Descarcă PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
