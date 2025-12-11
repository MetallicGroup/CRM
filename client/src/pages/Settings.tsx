import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { EmployeeType, EmployeeFixedCosts } from "@/lib/types";

const TYPE_LABELS: Record<EmployeeType, string> = {
  'AGENT': 'Agent',
  'PRODUCTIE': 'Producție',
  'INDIRECT': 'Indirect/HQ'
};

export default function Settings() {
  const { employees = [], showrooms = [], updateEmployee, resetData } = useStore();

  const handleShowroomChange = (empId: string, newShowroomId: string) => {
    updateEmployee(empId, { showroomId: newShowroomId });
  };

  const handleTypeChange = (empId: string, newType: EmployeeType) => {
    const emp = employees.find(e => e.id === empId);
    let newShowroomId: string | null = null;
    
    if (newType === 'AGENT') {
      // Păstrează showroom-ul existent sau setează primul showroom disponibil
      newShowroomId = emp?.showroomId || (showrooms.length > 0 ? showrooms[0].id : null);
    }
    // Pentru PRODUCTIE și INDIRECT, showroomId devine null
    
    updateEmployee(empId, { type: newType, showroomId: newShowroomId });
  };

  const agents = (employees || []).filter(e => e.type === 'AGENT');

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

      {/* Cheltuieli Fixe Lunare */}
      <Card>
        <CardHeader>
          <CardTitle>Cheltuieli Fixe Lunare</CardTitle>
          <CardDescription>
            Setează cheltuielile fixe pentru fiecare angajat. Acestea se vor înmulți automat cu numărul de luni selectate în pagina Angajați.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Angajat</TableHead>
                  <TableHead className="w-[80px]">Tip</TableHead>
                  <TableHead className="w-[100px]">Salariu/Lună</TableHead>
                  <TableHead className="w-[100px]">Amort. Auto</TableHead>
                  <TableHead className="w-[100px]">Combustibil</TableHead>
                  <TableHead className="w-[80px]">Revizii</TableHead>
                  <TableHead className="w-[100px]">Alte Ch. Auto</TableHead>
                  <TableHead className="w-[100px]">Abonamente</TableHead>
                  <TableHead className="w-[80px]">Diurne</TableHead>
                  <TableHead className="w-[100px]">Alte Chelt.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const fixedCosts = emp.fixedCosts || {
                    salariuLunar: 0,
                    amortizareAutoLunar: 0,
                    combustibilLunar: 0,
                    reviziiLunar: 0,
                    alteCheltuieliAutoLunar: 0,
                    abonamenteLunar: 0,
                    diurneLunar: 0,
                    alteCheltuieliLunar: 0
                  };
                  
                  const updateFixedCost = (field: keyof EmployeeFixedCosts, value: number) => {
                    updateEmployee(emp.id, { 
                      fixedCosts: { ...fixedCosts, [field]: value }
                    });
                  };
                  
                  return (
                    <TableRow key={emp.id} data-testid={`row-fixed-costs-${emp.id}`}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant={emp.type === 'AGENT' ? 'default' : 'secondary'} className="text-xs">
                          {TYPE_LABELS[emp.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.salariuLunar || ''} 
                          onChange={(e) => updateFixedCost('salariuLunar', Number(e.target.value))}
                          placeholder="0"
                          data-testid={`input-fixed-salariu-${emp.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.amortizareAutoLunar || ''} 
                          onChange={(e) => updateFixedCost('amortizareAutoLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.combustibilLunar || ''} 
                          onChange={(e) => updateFixedCost('combustibilLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8" 
                          value={fixedCosts.reviziiLunar || ''} 
                          onChange={(e) => updateFixedCost('reviziiLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.alteCheltuieliAutoLunar || ''} 
                          onChange={(e) => updateFixedCost('alteCheltuieliAutoLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.abonamenteLunar || ''} 
                          onChange={(e) => updateFixedCost('abonamenteLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8" 
                          value={fixedCosts.diurneLunar || ''} 
                          onChange={(e) => updateFixedCost('diurneLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24 h-8" 
                          value={fixedCosts.alteCheltuieliLunar || ''} 
                          onChange={(e) => updateFixedCost('alteCheltuieliLunar', Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
