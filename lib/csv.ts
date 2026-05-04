export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

function parseCsvMatrix(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseCsv(input: string): ParsedCsv {
  const matrix = parseCsvMatrix(input);
  const headers = (matrix[0] ?? []).map((h) => h.trim());
  const rows = matrix
    .slice(1)
    .map((cells) => {
      const mapped: Record<string, string> = {};
      headers.forEach((header, idx) => {
        mapped[header] = (cells[idx] ?? "").trim();
      });
      return mapped;
    })
    .filter((row) => Object.values(row).some((v) => v.length > 0));

  return { headers, rows };
}
