import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Crown,
  Clock,
  RefreshCw,
  UserCheck,
  ShoppingCart,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CRMDashboard() {
  const { user, isAdmin } = useAuth();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [period, setPeriod] = useState<string>("luna");

  const now = new Date();
  const formattedDate = format(now, "EEEE, d MMMM yyyy", { locale: ro });
  const formattedTime = format(now, "HH:mm:ss");

  const stats = [
    {
      title: "Total Clienți",
      value: "0",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Oferte Trimise",
      value: "0",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Vânzări",
      value: "0",
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Valoare Totală",
      value: "0 RON",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const offerStatuses = [
    { label: "Acceptate", value: 0, icon: CheckCircle, color: "text-green-600" },
    { label: "În Așteptare", value: 0, icon: Clock, color: "text-orange-600" },
    { label: "Refuzate", value: 0, icon: XCircle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Bună ziua, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Gestionezi întregul sistem CRM" 
                : "Bine ai venit în sistemul CRM"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Filtru Calendar Vânzări</CardTitle>
                <CardDescription>
                  Selectează date și agent pentru a vizualiza vânzările
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Resetează filtrul
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Selectează date sau luni
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ro }) : "Click pentru a selecta date..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Poți selecta mai multe zile, luni întregi sau combinații
              </p>
            </div>

            {/* Agent Selector */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <UserCheck className="h-4 w-4 text-blue-600" />
                Selectează agent
              </label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți agenții</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selectează un agent specific sau lasă "Toți"
              </p>
            </div>

            {/* Selected Dates Display */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Date selectate
              </label>
              <div className="p-3 bg-gray-50 rounded-lg min-h-[40px]">
                <p className="text-sm text-muted-foreground italic">
                  Nicio dată selectată - se afișează toate vânzările
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Vedere Generală Sistem</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Perioada:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="azi">Azi</SelectItem>
                  <SelectItem value="saptamana">Săptămâna aceasta</SelectItem>
                  <SelectItem value="luna">Luna aceasta</SelectItem>
                  <SelectItem value="an">Anul acesta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Agent:</span>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți agenții</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Offer Statuses */}
      <div className="grid md:grid-cols-3 gap-4">
        {offerStatuses.map((status, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <status.icon className={cn("h-8 w-8", status.color)} />
                <div>
                  <p className="text-2xl font-bold">{status.value}</p>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      {isAdmin && (
        <Card className="border-dashed border-blue-300 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              Modul CRM în Dezvoltare
            </CardTitle>
            <CardDescription>
              Următoarele funcționalități vor fi adăugate:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Gestionare Clienți (CRUD complet)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Sistem de Oferte cu PDF
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Target-uri lunare pentru agenți
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Follow-up-uri și notificări
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Gestionare Parteneri
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Vânzări și rapoarte
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
