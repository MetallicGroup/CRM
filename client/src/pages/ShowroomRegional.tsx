import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShowroomRegional() {
  const { showrooms, updateShowroom } = useStore();
  
  // Filter out the HQ showroom if it's treated differently, but here we want Regional ones.
  // Based on prompt: Constanta, Giurgiu, Teleorman. (Bucuresti Showroom is also a showroom with agents)
  const regionalShowrooms = showrooms.filter(s => ['Constanta', 'Giurgiu', 'Teleorman', 'Bucuresti_Showroom'].includes(s.location));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Showroom-uri Regionale</h1>
          <p className="text-muted-foreground">Costuri specifice per locație</p>
        </div>
        <MonthSelector />
      </div>

      <Tabs defaultValue={regionalShowrooms[0]?.id}>
        <TabsList>
          {regionalShowrooms.map(s => (
            <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
          ))}
        </TabsList>
        
        {regionalShowrooms.map(showroom => {
            const totalCost = Object.values(showroom.costs).reduce((a, b) => a + b, 0);
            
            return (
            <TabsContent key={showroom.id} value={showroom.id} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Costuri {showroom.name}</CardTitle>
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
                                        <TableCell>Chirii</TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                className="text-right"
                                                value={showroom.costs.rent}
                                                onChange={(e) => updateShowroom(showroom.id, { costs: { ...showroom.costs, rent: Number(e.target.value) } })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Utilități</TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                className="text-right"
                                                value={showroom.costs.utilities}
                                                onChange={(e) => updateShowroom(showroom.id, { costs: { ...showroom.costs, utilities: Number(e.target.value) } })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Marketing</TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                className="text-right"
                                                value={showroom.costs.marketing}
                                                onChange={(e) => updateShowroom(showroom.id, { costs: { ...showroom.costs, marketing: Number(e.target.value) } })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Abonamente</TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                className="text-right"
                                                value={showroom.costs.subscriptions}
                                                onChange={(e) => updateShowroom(showroom.id, { costs: { ...showroom.costs, subscriptions: Number(e.target.value) } })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Consumabile</TableCell>
                                        <TableCell className="text-right">
                                            <Input 
                                                type="number" 
                                                className="text-right"
                                                value={showroom.costs.consumables}
                                                onChange={(e) => updateShowroom(showroom.id, { costs: { ...showroom.costs, consumables: Number(e.target.value) } })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Total {showroom.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-primary">
                                {totalCost.toLocaleString('ro-RO')} RON
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Se distribuie doar agenților din {showroom.name}.
                            </p>
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Agenți alocați:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {showroom.employees.map(agentId => (
                                        <span key={agentId} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                                            {agentId}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            );
        })}
      </Tabs>
    </div>
  );
}
