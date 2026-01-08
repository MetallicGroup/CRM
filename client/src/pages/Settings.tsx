import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmployees, useUpdateEmployee } from "@/hooks/use-financials";
import { EmployeeType } from "@/lib/types";
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
  const { data: dbEmployees = [], isLoading: loadingEmployees } = useEmployees();
  const updateMutation = useUpdateEmployee();

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
  const agents2 = dbAgents.filter((u: SafeUser) => u.role === "AGENT" && u.active);

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
    const saved = manualAchizitii.find((a: AgentManualAchizitii) => a.agentId === agentId && a.luna === selectedMonth);
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
    updateMutation.mutate({ id: empId, data: { showroomId: newShowroomId } });
  };

  const handleTypeChange = (empId: string, newType: EmployeeType) => {
    updateMutation.mutate({ id: empId, data: { type: newType } });
  };

  const agents = dbEmployees.filter(e => e.type === 'AGENT');
  const employees = dbEmployees;

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
                        <SelectItem value="BUCURESTI">București</SelectItem>
                        <SelectItem value="IASI">Iași</SelectItem>
                        <SelectItem value="CLUJ">Cluj</SelectItem>
                        <SelectItem value="TIMISOARA">Timișoara</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cheltuieli Fixe section removed as it's now handled monthly in individual expense tables or bulk import */}

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
                {agents2.map((agent: SafeUser) => {
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

      {/* Reset Data card removed as it's no longer supported with React Query refactor */}
    </div>
  );
}
