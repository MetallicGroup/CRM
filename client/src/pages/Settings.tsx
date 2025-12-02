import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { EmployeeType } from "@/lib/types";

const TYPE_LABELS: Record<EmployeeType, string> = {
  'AGENT': 'Agent',
  'PRODUCTIE': 'Producție',
  'INDIRECT': 'Indirect/HQ'
};

export default function Settings() {
  const { employees, showrooms, updateEmployee, resetData } = useStore();

  const handleShowroomChange = (empId: string, newShowroomId: string) => {
    updateEmployee(empId, { showroomId: newShowroomId });
  };

  const handleTypeChange = (empId: string, newType: EmployeeType) => {
    const newShowroomId = newType === 'AGENT' ? 'sh_constanta' : null;
    updateEmployee(empId, { type: newType, showroomId: newShowroomId });
  };

  const agents = employees.filter(e => e.type === 'AGENT');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setări</h1>
        <p className="text-muted-foreground">Configurare tip angajat și asocieri showroom</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tip Angajat</CardTitle>
          <CardDescription>
            Schimbă tipul angajatului pentru a modifica cum se calculează costurile lor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angajat</TableHead>
                <TableHead>Tip Curent</TableHead>
                <TableHead>Schimbă Tip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} data-testid={`row-settings-${emp.id}`}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>
                    <Badge variant={emp.type === 'AGENT' ? 'default' : 'secondary'}>
                      {TYPE_LABELS[emp.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={emp.type} 
                      onValueChange={(val) => handleTypeChange(emp.id, val as EmployeeType)}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-type-${emp.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGENT">Agent (vinde)</SelectItem>
                        <SelectItem value="PRODUCTIE">Producție (costuri → garduri)</SelectItem>
                        <SelectItem value="INDIRECT">Indirect (costuri → toți)</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asociere Agenți - Showroom-uri</CardTitle>
          <CardDescription>
            Doar agenții pot fi asociați la showroom-uri
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Showroom Alocat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Select 
                      value={agent.showroomId || ''} 
                      onValueChange={(val) => handleShowroomChange(agent.id, val)}
                    >
                      <SelectTrigger className="w-[280px]" data-testid={`select-showroom-settings-${agent.id}`}>
                        <SelectValue placeholder="Selectează showroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {showrooms.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.location})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset Date</CardTitle>
          <CardDescription>
            Atenție: Aceasta va șterge toate datele introduse și va restaura valorile inițiale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={resetData} data-testid="button-reset-data">
            Resetează toate datele
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
