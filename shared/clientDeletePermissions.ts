/**
 * Cine poate șterge clienți/oferte din lista Clienti: administratori + conturi desemnate.
 * Folosit pe server (DELETE /api/clients/:id) și în UI (buton ștergere).
 */

export function normalizePersonName(n: string): string {
  return (n || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Nume complet normalizat (prenume + nume), aliniat la conturile reale din CRM. */
const CLIENT_DELETE_ALLOWED_FULL_NAMES = new Set([
  "coman madalina",
  "oana moneaga",
  "munteanu raluca",
  "marcu iulian",
  "marcu dana",
  "danu daniel",
  "daniel danu",
  "dragos frangache",
]);

const SPECIAL_KEYS_ALLOWED = new Set(["OANA", "MADALINA", "RALUCA"]);

export function canUserDeleteClients(params: {
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  specialKey?: string | null;
}): boolean {
  if (params.role === "ADMIN") return true;

  if (params.role === "SPECIAL" && params.specialKey) {
    if (SPECIAL_KEYS_ALLOWED.has(params.specialKey)) return true;
  }

  const full = normalizePersonName(
    `${params.firstName || ""} ${params.lastName || ""}`,
  );
  if (full && CLIENT_DELETE_ALLOWED_FULL_NAMES.has(full)) return true;

  return false;
}
