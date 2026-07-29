import Papa from "papaparse";
import type { RawRow } from "@/lib/mapping/types";

/**
 * Converts standardized rows to a compact CSV text blob for storage.
 * Storing delimited text instead of JSON avoids repeating every column name
 * on every row, which is the bulk of the storage cost for wide reports with
 * thousands of rows. Works identically on the server (Node) and client.
 */
export function rowsToCsv<T extends Record<string, string>>(rows: T[]): string {
  if (rows.length === 0) return "";
  return Papa.unparse(rows);
}

/** Reverses rowsToCsv — used when reanalyzing a batch without a re-upload. */
export function csvToRows<T extends Record<string, string> = RawRow>(csv: string): T[] {
  if (!csv.trim()) return [];
  const result = Papa.parse<T>(csv, { header: true, skipEmptyLines: true });
  return result.data;
}
