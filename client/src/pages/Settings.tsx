import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";

export default function Settings() {
  const { agents, showrooms, updateAgent } = useStore();

  const handleShowroomChange = (agentId: string, newShowroomId: string) => {
    updateAgent(agentId, { showroomId: newShowroomId });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setări</h1>
        <p className="text-muted-foreground">Configurare asocieri și parametri globali</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asociere Agenți - Showroom-uri</CardTitle>
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
                      defaultValue={agent.showroomId} 
                      onValueChange={(val) => handleShowroomChange(agent.id, val)}
                    >
                      <SelectTrigger className="w-[280px]">
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
    </div>
  );
}
