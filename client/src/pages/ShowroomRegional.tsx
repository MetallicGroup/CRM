import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore, getTotalsForMonth } from "@/lib/store";
import { MonthSelector } from "@/components/ui/month-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShowroomRegional() {
  const { showrooms = [], employees = [], updateShowroom, selectedMonth } = useStore();
  const fullStore = useStore();
  const totals = getTotalsForMonth(fullStore, selectedMonth);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Showroom-uri</h1>
          <p className="text-muted-foreground">Costuri specifice per locație (București: 20% agenți, 80% indirecte)</p>
        </div>
        <MonthSelector />
      </div>

      <Tabs defaultValue={showrooms[0]?.id}>
        <TabsList>
          {showrooms.map(s => (
            <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
          ))}
        </TabsList>
        
        {showrooms.map(showroom => {
            const totalCost = Object.values(showroom.costs).reduce((a, b) => a + b, 0);
            const isBucuresti = showroom.location === 'Bucuresti';
            const costDistribuit = isBucuresti ? totalCost * 0.20 : totalCost;
            const costIndirecte = isBucuresti ? totalCost * 0.80 : 0;
            
            const agentsInShowroom = employees.filter(e => e.type === 'AGENT' && e.showroomId === showroom.id);
            
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
                                                data-testid={`input-rent-${showroom.id}`}
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
                                                data-testid={`input-utilities-${showroom.id}`}
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
                                                data-testid={`input-marketing-${showroom.id}`}
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
                                                data-testid={`input-subscriptions-${showroom.id}`}
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
                                                data-testid={`input-consumables-${showroom.id}`}
                                            />
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
                                <p className="text-sm text-muted-foreground">Cost Total</p>
                                <div className="text-3xl font-bold text-primary" data-testid={`text-total-${showroom.id}`}>
                                    {totalCost.toLocaleString('ro-RO')} RON
                                </div>
                            </div>
                            
                            {isBucuresti && (
                                <div className="space-y-2 border-t pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">20% → Agenți:</span>
                                        <span className="font-bold text-blue-600">{costDistribuit.toLocaleString('ro-RO')} RON</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">80% → Indirecte:</span>
                                        <span className="font-bold text-purple-600">{costIndirecte.toLocaleString('ro-RO')} RON</span>
                                    </div>
                                </div>
                            )}
                            
                            {!isBucuresti && (
                                <p className="text-sm text-muted-foreground">
                                    100% se distribuie agenților din acest showroom.
                                </p>
                            )}
                            
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-2">Agenți în showroom ({agentsInShowroom.length}):</h4>
                                <div className="flex flex-wrap gap-2">
                                    {agentsInShowroom.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">Niciun agent alocat</span>
                                    ) : (
                                        agentsInShowroom.map(agent => (
                                            <Badge key={agent.id} variant="secondary">
                                                {agent.name}
                                            </Badge>
                                        ))
                                    )}
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
