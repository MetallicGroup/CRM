import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Download } from "lucide-react";
import { generateAccesoriiPdf, type AccesoriiPdfData } from "@/lib/ofertaPdf";

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
  { denumire: "CADRU - POARTA PIETONALA + ACCESORII", um: "buc", pretBuc: 1200 },
  { denumire: "CADRU - POARTA BATANTA + ACCESORII", um: "buc", pretBuc: 4800 },
  { denumire: "CADRU - POARTA CULISANTA + ACCESORII", um: "buc", pretBuc: 7000 },
  { denumire: "TABLA PLANA PRELUCRATA", um: "mp", pretBuc: 160 },
];

export default function OfertareAccesorii() {
  const { user } = useAuth();

  const [client, setClient] = useState("");
  const [cnpCui, setCnpCui] = useState("");
  const [telefon, setTelefon] = useState("");
  const [strada, setStrada] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [judet, setJudet] = useState("");

  const [accesorii, setAccesorii] = useState<
    { denumire: string; um: string; pretBuc: number; cant: number }[]
  >(ACCESORII_INITIAL.map((a) => ({ ...a, cant: 0 })));

  const accesoriiCuTotal = useMemo(
    () =>
      accesorii.map((a) => ({
        ...a,
        total: a.cant * a.pretBuc,
      })),
    [accesorii]
  );

  const totalValoareAccesorii = useMemo(
    () => accesoriiCuTotal.reduce((s, a) => s + a.total, 0),
    [accesoriiCuTotal]
  );

  const updateAccesoriuCant = (index: number, cant: number) => {
    setAccesorii((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], cant };
      return next;
    });
  };

  const handleDownloadPdf = () => {
    const agentName = user ? `${user.firstName} ${user.lastName}` : "Agent";
    const data: AccesoriiPdfData = {
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
      accesorii: accesoriiCuTotal.filter((a) => a.cant > 0),
      totalValoareAccesorii,
    };
    generateAccesoriiPdf(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofertare Accesorii Gard</h1>
        <p className="text-slate-400">
          Exact ca în Excel-ul „ACCESORII AUXILIARE” – completezi cantitățile și descarci oferta PDF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OFERTA / COMANDA CLIENT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nume client"
              />
            </div>
            <div className="space-y-2">
              <Label>CNP / CUI</Label>
              <Input
                value={cnpCui}
                onChange={(e) => setCnpCui(e.target.value)}
                placeholder="CNP sau CUI"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="Telefon"
              />
            </div>
            <div className="space-y-2">
              <Label>Strada</Label>
              <Input
                value={strada}
                onChange={(e) => setStrada(e.target.value)}
                placeholder="Strada, nr."
              />
            </div>
            <div className="space-y-2">
              <Label>Localitate</Label>
              <Input
                value={localitate}
                onChange={(e) => setLocalitate(e.target.value)}
                placeholder="Localitate"
              />
            </div>
            <div className="space-y-2">
              <Label>Județ</Label>
              <Input
                value={judet}
                onChange={(e) => setJudet(e.target.value)}
                placeholder="Județ"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ACCESORII AUXILIARE</CardTitle>
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
                    <td className="p-2 whitespace-nowrap">{a.denumire}</td>
                    <td className="p-2">{a.um}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20 h-8"
                        value={a.cant || ""}
                        onChange={(e) =>
                          updateAccesoriuCant(i, Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-2">{a.pretBuc} lei</td>
                    <td className="p-2 font-medium">
                      {accesoriiCuTotal[i].total > 0
                        ? `${accesoriiCuTotal[i].total.toFixed(2)} lei`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-medium">
            TOTAL ACCESORII: {totalValoareAccesorii.toFixed(2)} lei
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold">
                TOTAL GENERAL: {totalValoareAccesorii.toFixed(2)} lei
              </p>
            </div>
            <Button
              onClick={handleDownloadPdf}
              size="lg"
              className="gap-2"
              data-testid="button-download-pdf-accesorii"
            >
              <Download className="h-5 w-5" />
              Descarcă PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

