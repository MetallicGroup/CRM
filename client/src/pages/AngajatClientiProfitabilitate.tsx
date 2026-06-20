import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ArrowLeft, Edit, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MONTHS } from "@/lib/types";
import { useAgentProfitabilityClients } from "@/hooks/useAgentProfitabilityClients";

const CATEGORY_LABELS: Record<string, string> = {
  GARD: "Gard",
  ACOPERIS: "Acoperiș",
  FATADA: "Fațadă",
  SISTEM_PLUVIAL: "Sistem pluvial",
  SAGEAC: "Sageac",
  RULOURI_EXTERIOARE: "Rulouri exterioare",
};

function formatPeriod(startMonth: number, endMonth: number, year: number): string {
  if (startMonth === endMonth) {
    return `${MONTHS[startMonth - 1]} ${year}`;
  }
  return `${MONTHS[startMonth - 1]} – ${MONTHS[endMonth - 1]} ${year}`;
}

export default function AngajatClientiProfitabilitate() {
  const [, params] = useRoute("/profitabilitate/angajati/:agentId/clienti");
  const agentId = params?.agentId;

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const agentName = searchParams.get("name") || "Agent";
  const an = parseInt(searchParams.get("an") || String(new Date().getFullYear()));
  const startMonth = parseInt(searchParams.get("startMonth") || "1");
  const endMonth = parseInt(searchParams.get("endMonth") || String(startMonth));

  const backHref = `/profitabilitate/angajati?an=${an}&startMonth=${startMonth}&endMonth=${endMonth}`;

  const { data, isLoading, error } = useAgentProfitabilityClients(
    agentId,
    an,
    startMonth,
    endMonth
  );

  const clients = data?.clients ?? [];
  const totals = data?.totals ?? { venitTotal: 0, achizitieTotal: 0, adaosTotal: 0, count: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Înapoi la Angajați
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{agentName}</h1>
          <p className="text-slate-400">
            Clienți LIVRAȚI incluși în profitabilitate · {formatPeriod(startMonth, endMonth, an)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nr. clienți</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Venit total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {totals.venitTotal.toLocaleString("ro-RO")} RON
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Achiziție totală</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {totals.achizitieTotal.toLocaleString("ro-RO")} RON
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Adaos total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {totals.adaosTotal.toLocaleString("ro-RO")} RON
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clienți incluși în calcul ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Se încarcă clienții...</div>
          ) : error ? (
            <div className="py-12 text-center text-red-400">
              Nu s-au putut încărca clienții pentru acest agent.
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              Niciun client LIVRAT găsit pentru această perioadă.
            </div>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Contribuție</TableHead>
                    <TableHead>Partener</TableHead>
                    <TableHead>Data livrării</TableHead>
                    <TableHead className="text-right">Venit</TableHead>
                    <TableHead className="text-right">Achiziție</TableHead>
                    <TableHead className="text-right">Adaos</TableHead>
                    <TableHead className="w-[100px]">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/clienti?editClientId=${client.id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                          title="Deschide fișa completă a clientului"
                        >
                          {client.nume}
                        </Link>
                      </TableCell>
                      <TableCell>{client.telefon || "—"}</TableCell>
                      <TableCell>
                        {[client.localitate, client.judet].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {CATEGORY_LABELS[client.categorieProdus || ""] ||
                          client.categorieProdus ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            client.profitCategory === "GARD"
                              ? "border-green-600 text-green-400"
                              : "border-blue-600 text-blue-400"
                          }
                        >
                          {client.profitCategory === "GARD" ? "Gard" : "Acoperiș"}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.partnerName || "Direct"}</TableCell>
                      <TableCell>
                        {client.dataLivrarii
                          ? format(new Date(client.dataLivrarii), "dd MMM yyyy", { locale: ro })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-blue-400">
                        {Number(client.valoareOferta || 0).toLocaleString("ro-RO")} RON
                      </TableCell>
                      <TableCell className="text-right text-orange-400">
                        {Number(client.pretAchizitie || 0).toLocaleString("ro-RO")} RON
                      </TableCell>
                      <TableCell className="text-right text-emerald-400 font-medium">
                        {client.adaos.toLocaleString("ro-RO")} RON
                      </TableCell>
                      <TableCell>
                        <Link href={`/clienti?editClientId=${client.id}`}>
                          <Button variant="outline" size="sm" className="gap-2 h-8">
                            <Edit className="h-3.5 w-3.5" />
                            Fișa client
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        Sunt incluși clienții cu stadiu ofertă VÂNDUT, stadiu comandă LIVRAT, dată livrare în perioada
        selectată. Vânzările prin parteneri comisionari sunt excluse — aceeași logică ca în raportul de
        profitabilitate.
      </p>
    </div>
  );
}
