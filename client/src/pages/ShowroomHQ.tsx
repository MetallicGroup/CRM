import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore, getTotalsForMonth } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Trash2, Plus } from "lucide-react";
import { Employee } from "@/lib/types";

export default function ShowroomHQ() {
  const { hqEmployees, updateHQEmployee, addHQEmployee, removeHQEmployee, selectedMonth } = useStore();
  const totals = getTotalsForMonth(useStore(), selectedMonth);

  const handleAddEmployee = () => {
    const newEmp: Employee = {
      id: `hq_${Date.now()}`,
      name: 'Angajat Nou',
      role: 'Rol',
      costs: { salary: 0, auto: 0, fuel: 0, maintenance: 0, otherAuto: 0, subsistence: 0 }
    };
    addHQEmployee(newEmp);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Showroom București HQ</h1>
          <p className="text-muted-foreground">Gestionare angajați și costuri centrale</p>
        </div>
        <MonthSelector />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Angajați HQ</CardTitle>
            <Button onClick={handleAddEmployee} size="sm"><Plus className="mr-2 h-4 w-4" /> Adaugă</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Nume</TableHead>
                  <TableHead>Salariu</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Combustibil</TableHead>
                  <TableHead>Revizii</TableHead>
                  <TableHead>Alte Auto</TableHead>
                  <TableHead>Diurne</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hqEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Input 
                        value={emp.name} 
                        onChange={(e) => updateHQEmployee(emp.id, { name: e.target.value })}
                        className="h-8 w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.salary} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, salary: Number(e.target.value) } })}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.auto} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, auto: Number(e.target.value) } })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.fuel} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, fuel: Number(e.target.value) } })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.maintenance} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, maintenance: Number(e.target.value) } })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.otherAuto} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, otherAuto: Number(e.target.value) } })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={emp.costs.subsistence} 
                        onChange={(e) => updateHQEmployee(emp.id, { costs: { ...emp.costs, subsistence: Number(e.target.value) } })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeHQEmployee(emp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total HQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {totals.totalHQCosts.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Acest cost se distribuie TUTUROR agenților proporțional cu venitul lor.
            </p>
            <div className="mt-6 space-y-2">
               <div className="flex justify-between text-sm">
                 <span>Angajați:</span>
                 <span className="font-medium">{hqEmployees.length}</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
