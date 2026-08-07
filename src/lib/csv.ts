import "server-only";

// Minimal RFC 4180-ish CSV writer: quote a field only when it contains a
// comma, quote, or newline, doubling any embedded quotes.
export function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function rowsToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers.map(toCsvValue).join(",")];
  for (const row of rows) lines.push(row.map(toCsvValue).join(","));
  // Leading BOM so Excel opens UTF-8 CSVs (e.g. names with accents) correctly.
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(csv: string, filenamePrefix: string): Response {
  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
