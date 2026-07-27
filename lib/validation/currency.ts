export const SUPPORTED_CURRENCIES = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "ARS",
  "MXN",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code.toUpperCase());
}

/**
 * Formats a value as currency, always succeeding — an unknown/malformed
 * currency code falls back to BRL instead of throwing (the prototype threw
 * an uncaught RangeError on any bad Intl currency code).
 */
export function formatCurrency(value: number, currencyCode: string): string {
  const code = currencyCode?.toUpperCase().trim();
  const safeCode = isSupportedCurrency(code) ? code : "BRL";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: safeCode,
  }).format(value);
}
