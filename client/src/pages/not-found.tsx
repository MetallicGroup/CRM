import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#050608] via-[#070910] to-[#050608]">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-[#4b5563] bg-black/40 px-8 py-10 shadow-xl shadow-yellow-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-[#fbbf24]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">404 - Pagina nu există</h1>
            <p className="text-sm text-slate-400">
              Link-ul accesat nu corespunde niciunei pagini din CRM.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300">
          Dacă ai ajuns aici dintr-un meniu al aplicației, spune-mi ce URL vezi sus în browser
          și o pot conecta la pagina corectă. Până atunci, te poți întoarce în zona principală
          a CRM-ului.
        </p>

        <div className="mt-6">
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
