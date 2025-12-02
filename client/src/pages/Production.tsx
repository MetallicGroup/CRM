import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useStore, getTotalsForMonth } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";

export default function Production() {
  const { production, updateProductionEmployee, selectedMonth } = useStore();
  const totals = getTotalsForMonth(useStore(), selectedMonth);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Producție</h1>
          <p className="text-muted-foreground">Costuri angajați producție (Distribuite pe vânzări Garduri)</p>
        </div>
        <MonthSelector />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Angajați Producție</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Salariu</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Utilități</TableHead>
                  <TableHead>Altele</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {production.employees.map((emp, index) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Input 
                        value={emp.name} 
                        onChange={(e) => updateProductionEmployee(index, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.salary} 
                        onChange={(e) => updateProductionEmployee(index, { salary: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.auto} 
                        onChange={(e) => updateProductionEmployee(index, { auto: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.utilities} 
                        onChange={(e) => updateProductionEmployee(index, { utilities: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.other} 
                        onChange={(e) => updateProductionEmployee(index, { other: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Producție</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {totals.totalProductionCosts.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cost_Prod_Agent = Total_Prod * (Venit_Gard_Agent / Total_Venit_Gard_Firmă)
            </p>
            <div className="mt-4 p-4 bg-muted rounded-md text-xs text-muted-foreground">
              Dacă un agent nu a vândut garduri, costul alocat este 0.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
