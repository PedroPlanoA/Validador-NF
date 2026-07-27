/**
 * Robust BR/US numeric parser for values coming out of spreadsheets exported
 * by different platforms (Hotmart, Kiwify, emitters, etc). Handles:
 *  - "1.234,56" (BR)  and  "1,234.56" (US)
 *  - "R$ 1.234,56", "$1,234.56", stray spaces/currency symbols
 *  - "(123,45)" accounting-style negatives
 *  - ambiguous single-dot values: "1.234" is treated as a thousands-grouped
 *    integer (1234) when exactly 3 digits follow the dot and there's more
 *    than one digit before it — this fixes a real bug in the old prototype,
 *    which always read a lone dot as a decimal separator and silently
 *    mis-parsed thousands-grouped integers.
 */
export function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

  let s = String(raw).trim();
  if (s === "") return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
  }

  // Strip everything except digits, comma, dot, minus.
  s = s.replace(/[^0-9.,-]/g, "");
  s = s.replace(/-/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // comma is the decimal separator, dot(s) are thousands grouping
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // dot is the decimal separator, comma(s) are thousands grouping
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  } else if (hasDot && !hasComma) {
    const dotCount = (s.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      // multiple dots with no comma at all -> all thousands separators
      s = s.replace(/\./g, "");
    } else {
      const [intPart, fracPart] = s.split(".");
      if (fracPart?.length === 3 && intPart.length >= 1) {
        // looks like a thousands-grouped integer (e.g. "1.234" -> 1234),
        // not a 3-decimal-place value
        s = intPart + fracPart;
      }
      // else: leave as-is, it's a normal decimal like "1234.5"/"1234.56"
    }
  }

  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}
