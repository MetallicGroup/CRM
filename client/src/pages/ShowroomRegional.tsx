import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ShowroomCosts {
  sediuName: string;
  chirie: number;
  utilitati: number;
  marketing: number;
  consumabile: number;
  alteCheltuieli: number;
  total: number;
  cheltuieliAgenti: number;
  salarii: number;
  combustibil: number;
  auto: number;
}

export default function ShowroomRegional() {
  const { selectedMonth } = useStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: showroomCosts = {}, isLoading } = useQuery<Record<string, ShowroomCosts>>({
    queryKey: ["showroom-costs", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/showroom-costs?luna=${selectedMonth}&an=${selectedYear}`);
      if (!res.ok) throw new Error("Eroare la încărcarea costurilor");
      return res.json();
    },
  });

  const showrooms = Object.entries(showroomCosts).map(([id, data]) => ({
    id,
    name: data.sediuName,
    costs: data,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Showroom-uri</h1>
          <p className="text-muted-foreground">Cheltuieli pe locație - Luna {selectedMonth}/{selectedYear}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-year">
              <SelectValue placeholder="An" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MonthSelector />
        </div>
      </div>

      {showrooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nu există cheltuieli pentru această lună.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={showrooms[0]?.id}>
          <TabsList className="flex-wrap">
            {showrooms.map(s => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.name}
                {s.costs.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {s.costs.total.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {showrooms.map(showroom => {
            const costs = showroom.costs;
            const isBucuresti = showroom.name.toLowerCase().includes('bucurești');
            const cheltuieliShowroom = costs.chirie + costs.utilitati + costs.marketing + costs.consumabile + costs.alteCheltuieli;
            const costDistribuit = isBucuresti ? costs.total * 0.20 : costs.total;
            const costIndirecte = isBucuresti ? costs.total * 0.80 : 0;
            
            return (
              <TabsContent key={showroom.id} value={showroom.id} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Cheltuieli {showroom.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tip Cheltuială</TableHead>
                            <TableHead className="text-right">Valoare (RON)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-blue-50/50">
                            <TableCell colSpan={2} className="font-semibold text-blue-700">
                              Cheltuieli Showroom
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Chirii / Cota parte</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.chirie.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Utilități</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.utilitati.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Marketing</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.marketing.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Consumabile / Materiale</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.consumabile.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Alte cheltuieli showroom</TableCell>
                            <TableCell className="text-right font-medium">
                              {costs.alteCheltuieli.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-100/50">
                            <TableCell className="font-semibold">Subtotal Showroom</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {cheltuieliShowroom.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          
                          <TableRow className="bg-green-50/50">
                            <TableCell colSpan={2} className="font-semibold text-green-700">
                              Cheltuieli Agenți
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Salarii / Comisioane</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.salarii || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Combustibil</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.combustibil || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Auto (Leasing, Asigurări, Revizii)</TableCell>
                            <TableCell className="text-right font-medium">
                              {(costs.auto || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6">Alte cheltuieli agenți</TableCell>
                            <TableCell className="text-right font-medium">
                              {((costs.cheltuieliAgenti || 0) - (costs.salarii || 0) - (costs.combustibil || 0) - (costs.auto || 0)).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-green-100/50">
                            <TableCell className="font-semibold">Subtotal Agenți</TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                              {(costs.cheltuieliAgenti || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>

                          <TableRow className="bg-primary/10 font-bold">
                            <TableCell className="text-lg">TOTAL CHELTUIELI</TableCell>
                            <TableCell className="text-right text-lg text-primary">
                              {costs.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sumar {showroom.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cost Total Luna {selectedMonth}</p>
                        <div className="text-3xl font-bold text-primary" data-testid={`text-total-${showroom.id}`}>
                          {costs.total.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm border-t pt-4">
                        <div>
                          <span className="text-muted-foreground">Showroom:</span>
                          <div className="font-bold text-blue-600">
                            {cheltuieliShowroom.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agenți:</span>
                          <div className="font-bold text-green-600">
                            {(costs.cheltuieliAgenti || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                          </div>
                        </div>
                      </div>
                      
                      {isBucuresti && costs.total > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-xs text-muted-foreground font-medium">Distribuție București:</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">20% → Agenți:</span>
                            <span className="font-bold text-blue-600">{costDistribuit.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">80% → Indirecte:</span>
                            <span className="font-bold text-purple-600">{costIndirecte.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                          </div>
                        </div>
                      )}
                      
                      {!isBucuresti && costs.total > 0 && (
                        <p className="text-sm text-muted-foreground border-t pt-4">
                          100% se distribuie agenților din acest showroom.
                        </p>
                      )}
                      
                      {costs.total === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nu există cheltuieli înregistrate pentru această lună.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
