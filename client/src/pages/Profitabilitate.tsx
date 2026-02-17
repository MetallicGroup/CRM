import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Truck, 
  Settings,
  ArrowRight,
  TrendingUp,
  Calculator
} from "lucide-react";

const modules = [
  {
    icon: LayoutDashboard,
    title: "Raport Financiar",
    description: "Dashboard cu grafice și metrici generale",
    href: "/profitabilitate/raport",
    color: "bg-blue-500",
  },
  {
    icon: Users,
    title: "Angajați",
    description: "Date financiare detaliate pentru fiecare angajat",
    href: "/profitabilitate/angajati",
    color: "bg-green-500",
  },
  {
    icon: Building2,
    title: "Showroom-uri",
    description: "Costuri regionale și distribuție",
    href: "/profitabilitate/showroom-uri",
    color: "bg-purple-500",
  },
  {
    icon: Truck,
    title: "Distribuitori",
    description: "Urmărire financiară distribuitori",
    href: "/profitabilitate/distribuitori",
    color: "bg-orange-500",
  },
  {
    icon: Settings,
    title: "Setări Financiar",
    description: "Configurare tipuri angajați și showroom-uri",
    href: "/profitabilitate/setari",
    color: "bg-gray-500",
  },
];

export default function Profitabilitate() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Calculator className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profitabilitate</h1>
          <p className="text-slate-400">
            Modul financiar - calculează profituri, costuri și distribuții
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${module.color}`}>
                    <module.icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
                <CardTitle className="mt-4">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Formule de Calcul
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium text-blue-800">Adaos fără TVA</p>
              <p className="text-slate-400">= Adaos cu TVA × 79%</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium text-blue-800">TVA</p>
              <p className="text-slate-400">= Adaos cu TVA × 21%</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium text-blue-800">Costuri Showroom</p>
              <p className="text-slate-400">= Distribuite egal între agenți</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium text-blue-800">București Special</p>
              <p className="text-slate-400">= 20% local, 80% indirect</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
