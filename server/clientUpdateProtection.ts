import type { Client, UpdateClient } from "@shared/schema";

/** Câmpuri care se aplică mereu la PATCH (inclusiv schimbări de status/boolean). */
const ALWAYS_APPLY = new Set([
  "nume",
  "telefon",
  "stadiuOferta",
  "stadiuComanda",
  "sursa",
  "categorieProdus",
  "contactat",
  "incasat",
  "avans",
  "avansIncasat",
  "followUpEfectuat1",
  "followUpEfectuat2",
  "followUpEfectuat3",
  "underObservation",
  "urgenta",
  "prioritate",
  "isPartnerOrder",
  "smartDripstop",
  "brand",
  "model",
  "grosime",
  "finisaj",
  "culoare",
]);

function existingHasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim() !== "";
  if (typeof val === "boolean") return true;
  if (val instanceof Date) return !isNaN(val.getTime());
  return true;
}

function incomingIsEmpty(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (typeof val === "string") return val.trim() === "";
  return false;
}

/** Mapare câmp → flag explicit de ștergere din body (doar acțiuni intenționate). */
const CLEAR_FLAG_BY_FIELD: Record<string, string> = {
  pretAchizitie: "clearPretAchizitie",
  achizitiePartener: "clearAchizitiePartener",
  ofertaFilename: "clearOfertaFilename",
  ofertaFilename2: "clearOfertaFilename2",
  ofertaFilename3: "clearOfertaFilename3",
};

/**
 * Elimină din payload actualizările care ar goli un câmp deja completat de alt user.
 * Regula: valorile goale nu suprascriu valori existente, decât cu flag clear* explicit
 * SAU când allowClear=true (editori de încredere: admin, Madalina, Raluca, etc.).
 */
export function protectClientUpdateFromAccidentalClear(
  existing: Client,
  data: UpdateClient,
  body: Record<string, unknown>,
  options?: { allowClear?: boolean },
): UpdateClient {
  const next = { ...data };
  const allowClear = options?.allowClear === true;

  for (const key of Object.keys(next) as Array<keyof UpdateClient>) {
    if (ALWAYS_APPLY.has(key as string)) continue;

    const incoming = (next as any)[key];
    if (incoming === undefined) continue;

    const existingVal = (existing as any)[key];
    const clearFlag = CLEAR_FLAG_BY_FIELD[key as string];

    if (incomingIsEmpty(incoming) && existingHasValue(existingVal)) {
      if (allowClear || (clearFlag && body[clearFlag] === true)) {
        (next as any)[key] = null;
      } else {
        delete (next as any)[key];
      }
    }
  }

  return next;
}
