"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawRow } from "@/lib/mapping/types";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: RawRow[];
}

/** Parses a CSV or XLS/XLSX File client-side into headers + row objects. */
export function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = result.meta.fields ?? [];
          resolve({ headers, rows: result.data });
        },
        error: reject,
      });
    });
  }

  // xls / xlsx
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  });
}
