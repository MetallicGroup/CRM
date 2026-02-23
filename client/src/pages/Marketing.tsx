import { Megaphone } from "lucide-react";

export default function Marketing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#0a0c0f] text-slate-200">
      <div className="rounded-xl border border-[#1f2937] bg-[#111827]/50 p-12 text-center max-w-md">
        <Megaphone className="h-14 w-14 text-slate-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Marketing</h1>
        <p className="text-sm text-slate-400">
          Modul în dezvoltare: campanii SMS, analytics Ads, automatizări. Focus: online și ateliere de sudură.
        </p>
      </div>
    </div>
  );
}
