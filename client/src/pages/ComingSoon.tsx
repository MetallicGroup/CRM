import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useLocation } from "wouter";

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
      default:
        return "Această pagină";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">În Curând</CardTitle>
          <CardDescription className="text-base">
            Modulul <strong>{getPageName()}</strong> este în dezvoltare
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            Această funcționalitate va fi disponibilă în curând. 
            Lucrăm la implementarea ei pentru a-ți oferi cea mai bună experiență.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
