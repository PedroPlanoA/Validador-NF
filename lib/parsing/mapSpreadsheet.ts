"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawRow } from "@/lib/mapping/types";

/**
 * Lê a planilha e devolve **apenas as colunas mapeadas**, aplicando `mapRow` a
 * cada linha.
 *
 * Em CSV a leitura é em pedaços (`chunk` do PapaParse): cada linha é reduzida às
 * poucas colunas que o mapeamento usa e o resto é descartado na hora, então o
 * pico de memória acompanha o tamanho do resultado, não o do arquivo. Isso
 * importa em relatório de centenas de milhares de linhas, onde guardar todas as
 * colunas originais em memória derruba a aba do navegador.
 *
 * XLS/XLSX não permite leitura incremental sem outra biblioteca — ali o arquivo
 * é aberto inteiro e mapeado em seguida.
 */
export function mapSpreadsheet<T extends Record<string, string>>(
  file: File,
  mapRow: (row: RawRow) => T,
): Promise<T[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      const mapped: T[] = [];
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        chunk: (results) => {
          for (const row of results.data) mapped.push(mapRow(row));
        },
        complete: () => resolve(mapped),
        error: reject,
      });
    });
  }

  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
    return rows.map(mapRow);
  });
}
