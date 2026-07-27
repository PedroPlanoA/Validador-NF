/**
 * Normalizes a codigoVenda for matching purposes: trims, strips every
 * configured cleanup character/substring, and lowercases. Used both when
 * standardizing rows at import time (Sale.codigoVendaNormalized /
 * Invoice.codigoVendaNormalized are stored pre-computed) and never
 * recomputed with the "wrong" config's cleanupChars — each record carries
 * the normalization produced by its own originating config, fixing the old
 * prototype's bug where reconciliation always used emitters[0]'s cleanupChars
 * for every invoice regardless of which emitter config produced it.
 */
export function normalizeCode(raw: string, cleanupCharsStr: string): string {
  let s = (raw ?? "").trim();
  const chars = cleanupCharsStr
    .split(/\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const ch of chars) {
    s = s.split(ch).join("");
  }
  return s.toLowerCase();
}

export function normalizeInvoiceNumber(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const digitsOnly = s.replace(/\D/g, "");
  if (digitsOnly) {
    const asInt = parseInt(digitsOnly, 10);
    if (asInt > 0) return String(asInt);
  }
  return s || "S/N";
}
