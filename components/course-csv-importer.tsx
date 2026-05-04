"use client";

import { useMemo, useState, useTransition } from "react";
import { importUniversityCoursesCsvAction } from "@/lib/actions/universities";
import { autoMapCsvHeaders, courseCsvFieldDefinitions, type CourseCsvMapping } from "@/lib/course-csv-import";
import { parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";

type UniversityOption = {
  id: string;
  name: string | null;
};

type ImportResult = Awaited<ReturnType<typeof importUniversityCoursesCsvAction>>;

export function CourseCsvImporter({ universities }: { universities: UniversityOption[] }) {
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<CourseCsvMapping>({});
  const [mapperOpen, setMapperOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedUniversities = useMemo(
    () => [...universities].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [universities],
  );

  const requiredMissing = courseCsvFieldDefinitions
    .filter((field) => field.required)
    .some((field) => !mapping[field.key]);

  async function detectHeaders() {
    if (!csvFile) {
      setErrorMessage("Please choose a CSV file first.");
      return;
    }
    const text = await csvFile.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      setErrorMessage("No CSV headers were detected.");
      return;
    }
    setHeaders(parsed.headers);
    setPreviewRows(parsed.rows.slice(0, 5));
    setMapping(autoMapCsvHeaders(parsed.headers));
    setMapperOpen(true);
    setErrorMessage(null);
    setResult(null);
  }

  function onImport() {
    if (!csvFile) {
      setErrorMessage("Please upload a CSV file.");
      return;
    }
    if (!selectedUniversity) {
      setErrorMessage("Please select a university.");
      return;
    }
    if (requiredMissing) {
      setErrorMessage("Please map all required fields.");
      setMapperOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append("universityId", selectedUniversity);
    formData.append("coursesCsv", csvFile);
    formData.append("mappingJson", JSON.stringify(mapping));

    startTransition(async () => {
      try {
        const res = await importUniversityCoursesCsvAction(formData);
        setResult(res);
        setErrorMessage(null);
      } catch (error) {
        setResult(null);
        setErrorMessage(error instanceof Error ? error.message : "Import failed.");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-800">Select university</span>
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">Choose saved university</option>
            {sortedUniversities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name?.trim() || "Unnamed university"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-800">Upload CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 focus:border-black focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void detectHeaders()} disabled={!csvFile || pending}>
          Detect headers
        </Button>
        <Button type="button" onClick={onImport} disabled={!csvFile || !selectedUniversity || pending}>
          {pending ? "Importing..." : "Import all courses"}
        </Button>
      </div>

      <p className="text-xs text-zinc-600">
        Option A intake format is supported in one column: <span className="font-medium">Jan:open|May:closed|Sep:closing</span>.
        Also supports month-only values like <span className="font-medium">September</span> (defaults to open). Empty values and{" "}
        <span className="font-medium">Not specified</span> are stored as blank. Duplicate courses under the same university are inserted as
        separate records.
      </p>

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      {result ? (
        <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <p>
            Imported <span className="font-semibold">{result.inserted}</span> of <span className="font-semibold">{result.total}</span>{" "}
            rows. Failed: <span className="font-semibold">{result.failed}</span>.
          </p>
          {result.errors.length > 0 ? (
            <div className="max-h-52 overflow-auto rounded-md border border-zinc-200 bg-white p-2 text-xs">
              {result.errors.map((entry) => (
                <p key={`${entry.row}-${entry.message}`}>Row {entry.row}: {entry.message}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {mapperOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Map CSV headers to course fields</h2>
                <p className="text-sm text-zinc-600">Confirm mappings before import to avoid wrong column assignment.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setMapperOpen(false)}>
                Done
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {courseCsvFieldDefinitions.map((field) => (
                <label key={field.key} className="grid gap-1">
                  <span className="text-sm font-medium text-zinc-800">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || undefined,
                      }))
                    }
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200"
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header) => (
                      <option key={`${field.key}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {previewRows.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-zinc-800">CSV preview (first 5 rows)</p>
                <div className="max-h-52 overflow-auto rounded-md border border-zinc-200">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50">
                      <tr>
                        {headers.map((header) => (
                          <th key={`preview-header-${header}`} className="px-2 py-1.5 font-medium text-zinc-600">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`preview-row-${index}`} className="border-b border-zinc-100 last:border-b-0">
                          {headers.map((header) => (
                            <td key={`preview-cell-${index}-${header}`} className="px-2 py-1.5 text-zinc-700">
                              {row[header] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
