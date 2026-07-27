import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

type OfferFileActivity = {
  id: string;
  userId: string;
  userName: string | null;
  type: string;
  createdAt: string;
  meta: {
    slot?: number;
    action?: string;
    from?: string | null;
    to?: string | null;
    originalFilename?: string;
    byName?: string | null;
  } | null;
};

function actionLabel(action?: string) {
  if (action === "upload") return "încărcat";
  if (action === "replace") return "înlocuit";
  if (action === "clear") return "șters";
  return action || "modificat";
}

function fileLabel(path?: string | null, original?: string) {
  if (original) return original;
  if (!path) return "—";
  return path.split("/").pop() || path;
}

export function OfferFileHistory({ clientId }: { clientId: string }) {
  const { data: logs = [], isLoading } = useQuery<OfferFileActivity[]>({
    queryKey: ["client-offer-file-history", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/activity?type=OFFER_FILE_CHANGE`);
      if (!res.ok) throw new Error("Eroare la încărcarea istoricului");
      return res.json();
    },
    enabled: !!clientId,
  });

  return (
    <div className="space-y-2" data-testid="offer-file-history">
      <h4 className="font-medium text-sm">Istoric fișiere ofertă</h4>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Se încarcă...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nicio modificare înregistrată încă.</p>
      ) : (
        <ul className="space-y-2 text-sm max-h-56 overflow-y-auto">
          {logs.map((log) => (
            <li key={log.id} className="rounded-md border p-2 bg-muted/30">
              <div className="font-medium">
                Ofertă {log.meta?.slot ?? "?"} — {actionLabel(log.meta?.action)}
              </div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: ro })}
                {" · "}
                {log.meta?.byName || log.userName || "Utilizator necunoscut"}
              </div>
              {(log.meta?.action === "replace" || log.meta?.action === "clear") && (
                <div className="text-xs mt-1 text-muted-foreground">
                  Din: {fileLabel(log.meta?.from)}
                </div>
              )}
              {log.meta?.action !== "clear" && (
                <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Fișier: {fileLabel(log.meta?.to, log.meta?.originalFilename)}</span>
                  {log.meta?.to && (
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() =>
                        window.open(`${window.location.origin}${log.meta?.to}`, "_blank", "noopener")
                      }
                    >
                      Deschide
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
