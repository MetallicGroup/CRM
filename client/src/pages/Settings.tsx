import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { EmployeeType, EmployeeFixedCosts } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface AgentManualAchizitii {
  id: string;
  agentId: string;
  luna: number;
  an: number;
  achizitieGard: string;
  achizitieAcoperis: string;
}

interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

const TYPE_LABELS: Record<EmployeeType, string> = {
  'AGENT': 'Agent',
  'PRODUCTIE': 'Producție',
  'INDIRECT': 'Indirect/HQ'
};

const MONTHS = [
  { value: 1, label: "Ianuarie" },
  { value: 2, label: "Februarie" },
  { value: 3, label: "Martie" },
  { value: 4, label: "Aprilie" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Iunie" },
  { value: 7, label: "Iulie" },
  { value: 8, label: "August" },
  { value: 9, label: "Septembrie" },
  { value: 10, label: "Octombrie" },
  { value: 11, label: "Noiembrie" },
  { value: 12, label: "Decembrie" },
];

export default function Settings() {
  const { employees = [], showrooms = [], updateEmployee, resetData } = useStore();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editedValues, setEditedValues] = useState<Record<string, { achizitieGard: string; achizitieAcoperis: string }>>({});
  
  // Fetch agents from database
  const { data: dbAgents = [], isLoading: loadingAgents } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });
  
  // Filter only AGENT role users
  const agents2 = dbAgents.filter(u => u.role === "AGENT" && u.active);
  
  // Fetch manual acquisitions for selected year
  const { data: manualAchizitii = [], isLoading: loadingAchizitii } = useQuery<AgentManualAchizitii[]>({
    queryKey: ["/api/profitabilitate/achizitii-manuale", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/profitabilitate/achizitii-manuale?an=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manual acquisitions");
      return res.json();
    }
  });
  
  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: async (data: { agentId: string; luna: number; an: number; achizitieGard: string; achizitieAcoperis: string }) => {
      const res = await fetch("/api/profitabilitate/achizitii-manuale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profitabilitate/achizitii-manuale"] });
      toast.success("Achiziție salvată cu succes");
    },
    onError: () => {
      toast.error("Eroare la salvarea achiziției");
    }
  });
  
  // Get value for an agent/month
  const getAchizitieValue = (agentId: string, field: "achizitieGard" | "achizitieAcoperis") => {
    // Check edited values first
    if (editedValues[agentId]?.[field] !== undefined) {
      return editedValues[agentId][field];
    }
    // Check saved data
    const saved = manualAchizitii.find(a => a.agentId === agentId && a.luna === selectedMonth);
    return saved?.[field] || "0";
  };
  
  const handleValueChange = (agentId: string, field: "achizitieGard" | "achizitieAcoperis", value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        achizitieGard: field === "achizitieGard" ? value : (prev[agentId]?.achizitieGard ?? getAchizitieValue(agentId, "achizitieGard")),
        achizitieAcoperis: field === "achizitieAcoperis" ? value : (prev[agentId]?.achizitieAcoperis ?? getAchizitieValue(agentId, "achizitieAcoperis"))
      }
    }));
  };
  
  const handleSave = (agentId: string) => {
    const values = editedValues[agentId] || {
      achizitieGard: getAchizitieValue(agentId, "achizitieGard"),
      achizitieAcoperis: getAchizitieValue(agentId, "achizitieAcoperis")
    };
    
    saveMutation.mutate({
      agentId,
      luna: selectedMonth,
      an: selectedYear,
      achizitieGard: values.achizitieGard,
      achizitieAcoperis: values.achizitieAcoperis
    });
    
    // Clear edited value after save
    setEditedValues(prev => {
      const copy = { ...prev };
      delete copy[agentId];
      return copy;
    });
  };
  
  // Reset edited values when month/year changes
  useEffect(() => {
    setEditedValues({});
  }, [selectedMonth, selectedYear]);

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

      {/* Achiziții Manuale pe Lună */}
      <Card>
        <CardHeader>
          <CardTitle>Achiziții Manuale pe Lună</CardTitle>
          <CardDescription>
            Introduceți valoarea totală a achizițiilor pentru fiecare agent pe lună. Aceste valori se vor aduna în calculul profitabilității.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">An:</span>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Luna:</span>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(loadingAgents || loadingAchizitii) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="w-[150px]">Achiziție Gard (lei)</TableHead>
                  <TableHead className="w-[150px]">Achiziție Acoperiș (lei)</TableHead>
                  <TableHead className="w-[100px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents2.map((agent) => {
                  const hasChanges = editedValues[agent.id] !== undefined;
                  return (
                    <TableRow key={agent.id} data-testid={`row-achizitii-${agent.id}`}>
                      <TableCell className="font-medium">
                        {agent.firstName} {agent.lastName}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-32 h-8"
                          value={getAchizitieValue(agent.id, "achizitieGard")}
                          onChange={(e) => handleValueChange(agent.id, "achizitieGard", e.target.value)}
                          placeholder="0"
                          data-testid={`input-achizitie-gard-${agent.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-32 h-8"
                          value={getAchizitieValue(agent.id, "achizitieAcoperis")}
                          onChange={(e) => handleValueChange(agent.id, "achizitieAcoperis", e.target.value)}
                          placeholder="0"
                          data-testid={`input-achizitie-acoperis-${agent.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSave(agent.id)}
                          disabled={saveMutation.isPending}
                          variant={hasChanges ? "default" : "outline"}
                          data-testid={`button-save-achizitie-${agent.id}`}
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
