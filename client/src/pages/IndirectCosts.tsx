import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useStore, getTotalsForMonth } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";

export default function IndirectCosts() {
  const { indirectCosts, updateIndirectCosts, selectedMonth } = useStore();
  const totals = getTotalsForMonth(useStore(), selectedMonth);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheltuieli Indirecte Speciale</h1>
          <p className="text-muted-foreground">Costuri generale distribuite tuturor agenților</p>
        </div>
        <MonthSelector />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Detalii Cheltuieli</CardTitle>
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
                <TableRow>
                  <TableCell>Salarii Indirecte</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.salaries} 
                      onChange={(e) => updateIndirectCosts({ salaries: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Auto</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.auto} 
                      onChange={(e) => updateIndirectCosts({ auto: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Chirii</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.rent} 
                      onChange={(e) => updateIndirectCosts({ rent: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Utilități</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.utilities} 
                      onChange={(e) => updateIndirectCosts({ utilities: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Marketing</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.marketing} 
                      onChange={(e) => updateIndirectCosts({ marketing: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Abonamente</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.subscriptions} 
                      onChange={(e) => updateIndirectCosts({ subscriptions: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Consumabile</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="text-right"
                      value={indirectCosts.consumables} 
                      onChange={(e) => updateIndirectCosts({ consumables: Number(e.target.value) })}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Indirecte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {totals.totalIndirectCosts.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cost_Indirect_Agent = Total_Indirect * (Venit_Agent / Total_Venit_Firma)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
