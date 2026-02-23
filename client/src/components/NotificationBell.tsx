import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationData {
  unreadMessages: number;
  recentMessages: {
    type: "message";
    from: string;
    fromUserId: string;
    lastMessage: string | null;
    lastAt: string | null;
  }[];
  recentLeads: {
    id: string;
    nume: string;
    sursa: string;
    dataAdaugare: string | null;
    dataOfertarii: string | null;
  }[];
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mesaje" | "leaduri">("mesaje");
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery<NotificationData>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Eroare la încărcarea notificărilor");
      return res.json();
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", handleClickOutside);
      refetch();
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, refetch]);

  const unread = data?.unreadMessages ?? 0;
  const recentMessages = data?.recentMessages ?? [];
  const recentLeads = data?.recentLeads ?? [];

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-slate-300 hover:bg-[#1f2937] hover:text-[#fbbf24] transition-colors"
        aria-label="Notificări"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50 w-[380px] max-h-[420px]",
            "rounded-xl shadow-xl border border-[#1f2937]",
            "bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden"
          )}
        >
          <div className="bg-gradient-to-r from-violet-600/30 to-blue-600/30 px-4 py-3">
            <h2 className="font-semibold text-slate-100">Notificări</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {unread > 0
                ? `Ai ${unread} mesaje necitite`
                : "Nu ai mesaje necitite"}
            </p>
          </div>

          <div className="border-b border-[#1f2937] flex">
            <button
              type="button"
              onClick={() => setTab("mesaje")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium",
                tab === "mesaje"
                  ? "text-[#fbbf24] border-b-2 border-[#fbbf24]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Mesaje
            </button>
            <button
              type="button"
              onClick={() => setTab("leaduri")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium",
                tab === "leaduri"
                  ? "text-[#fbbf24] border-b-2 border-[#fbbf24]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Lead-uri
            </button>
          </div>

          <div className="overflow-y-auto max-h-[280px]">
            {tab === "mesaje" && (
              <div className="p-2 space-y-1">
                {recentMessages.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Niciun mesaj recent
                  </p>
                ) : (
                  recentMessages.map((m, i) => (
                    <Link
                      key={i}
                      href="/chat"
                      onClick={() => setOpen(false)}
                      className="block rounded-lg p-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#1f2937] transition-colors"
                    >
                      <div className="text-sm text-slate-200 truncate">
                        {m.from}: {m.lastMessage ?? ""}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {m.lastAt
                          ? format(new Date(m.lastAt), "dd.MM.yyyy HH:mm:ss", {
                              locale: ro,
                            })
                          : ""}
                      </div>
                      <span className="text-xs text-[#fbbf24] mt-1 inline-block">
                        Deschide conversația
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
            {tab === "leaduri" && (
              <div className="p-2 space-y-1">
                {recentLeads.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Niciun lead recent
                  </p>
                ) : (
                  recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/clienti?highlight=${lead.id}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg p-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#1f2937] transition-colors"
                    >
                      <div className="text-sm text-slate-200 truncate">
                        {lead.nume}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Sursa: {lead.sursa}
                        {lead.dataAdaugare
                          ? " · " +
                            format(new Date(lead.dataAdaugare), "dd.MM.yyyy", {
                              locale: ro,
                            })
                          : ""}
                      </div>
                      <span className="text-xs text-[#fbbf24] mt-1 inline-block">
                        Deschide lead-ul
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-[#1f2937]">
            <Link
              href={tab === "mesaje" ? "/chat" : "/clienti"}
              onClick={() => setOpen(false)}
              className="block w-full rounded-lg bg-[#1f2937] hover:bg-[#374151] text-slate-200 text-center py-2.5 text-sm font-medium transition-colors"
            >
              {tab === "mesaje" ? "Vezi mesajele" : "Vezi lead-urile"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
