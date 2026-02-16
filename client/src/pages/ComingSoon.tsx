import { Construction } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ComingSoon() {
  const [location] = useLocation();

  const getPageName = () => {
    switch (location) {
      case "/clienti":
        return "Clienți";
      case "/oferte":
        return "Oferte";
      case "/targeturi":
        return "Target-uri";
      case "/parteneri":
        return "Parteneri";
      case "/vanzari":
        return "Vânzări";
      case "/financiar":
        return "Raport Financiar";
      case "/financiar/angajati":
        return "Angajați (Financiar)";
      case "/financiar/showroom-uri":
        return "Showroom-uri (Financiar)";
      case "/financiar/distribuitori":
        return "Distribuitori (Financiar)";
      case "/financiar/setari":
        return "Setări Financiar";
      default:
        return "Această pagină";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-[#050608] via-[#070910] to-[#050608]">
      <div className="max-w-lg w-full mx-4 rounded-2xl border border-[#4b5563] bg-black/40 px-8 py-10 text-center shadow-xl shadow-yellow-500/10">
        <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
          <Construction className="h-8 w-8 text-[#fbbf24]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-50 mb-2">Modul în dezvoltare</h1>
        <p className="text-base text-slate-300 mb-4">
          Modulul <span className="font-semibold text-[#fbbf24]">{getPageName()}</span> este în lucru.
        </p>
        <p className="text-sm text-slate-400">
          Funcționalitatea va fi disponibilă în curând. Lucrăm la implementare astfel încât să se potrivească
          cu restul CRM-ului Metallic Group.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-semibold px-6">
              Înapoi la Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
