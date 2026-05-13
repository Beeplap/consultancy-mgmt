"use client";

import { useMemo, useState, useTransition } from "react";
import { createManualUniversityCourseAction, importUniversityCoursesCsvAction } from "@/lib/actions/universities";
import { autoMapCsvHeaders, courseCsvFieldDefinitions, type CourseCsvMapping } from "@/lib/course-csv-import";
import { parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";

type UniversityOption = {
  id: string;
  name: string | null;
  courses?: Array<{ id: string; name: string | null }>;
};

type ImportResult = Awaited<ReturnType<typeof importUniversityCoursesCsvAction>>;

function normalizeCourseName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function CourseCsvImporter({ universities }: { universities: UniversityOption[] }) {
  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
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

  const selectedUniversityCourses = useMemo(
    () => sortedUniversities.find((university) => university.id === selectedUniversity)?.courses ?? [],
    [selectedUniversity, sortedUniversities],
  );

  const importPreview = useMemo(() => {
    const courseNameHeader = mapping.courseName;
    if (!selectedUniversity || !courseNameHeader || csvRows.length === 0) return null;

    const existingNames = new Set(selectedUniversityCourses.map((course) => normalizeCourseName(course.name)).filter(Boolean));
    let rowsWithCourseName = 0;
    let adds = 0;
    let updates = 0;

    for (const row of csvRows) {
      const courseName = normalizeCourseName(row[courseNameHeader]);
      if (!courseName) continue;
      rowsWithCourseName += 1;
      if (existingNames.has(courseName)) {
        updates += 1;
      } else {
        adds += 1;
        existingNames.add(courseName);
      }
    }

    return { adds, updates, rowsWithCourseName };
  }, [csvRows, mapping.courseName, selectedUniversity, selectedUniversityCourses]);

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
    setCsvRows(parsed.rows);
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

  function onManualSubmit(formData: FormData) {
    if (!selectedUniversity) {
      setErrorMessage("Please select a university.");
      return;
    }
    formData.set("universityId", selectedUniversity);
    startTransition(async () => {
      try {
        await createManualUniversityCourseAction(formData);
        setErrorMessage(null);
        setResult(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Manual add failed.");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <span className="text-sm font-medium text-zinc-800">Add mode</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("csv")}
            className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
              mode === "csv" ? "border-black bg-black text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Import using CSV
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
              mode === "manual" ? "border-black bg-black text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Add manually
          </button>
        </div>
      </div>

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
        {mode === "csv" ? (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-800">Upload CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 focus:border-black focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        ) : null}
      </div>

      {mode === "csv" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void detectHeaders()} disabled={pending}>
              Detect headers
            </Button>
            <Button type="button" onClick={onImport} disabled={pending}>
              {pending ? "Importing..." : "Import all courses"}
            </Button>
          </div>

          {importPreview && !result ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Ready to import {importPreview.rowsWithCourseName} course{importPreview.rowsWithCourseName === 1 ? "" : "s"}:{" "}
              <span className="font-semibold text-zinc-900">{importPreview.adds}</span> will be added and{" "}
              <span className="font-semibold text-zinc-900">{importPreview.updates}</span> already exist, so they will be updated.
            </div>
          ) : null}
        </>
      ) : (
        <form action={onManualSubmit} className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <input type="hidden" name="universityId" value={selectedUniversity} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Course name *</span>
              <input name="courseName" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Degree *</span>
              <input name="degree" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Duration *</span>
              <input name="duration" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Field *</span>
              <input name="field" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Minimum GPA *</span>
              <input name="min_gpa" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Minimum IELTS *</span>
              <input name="min_ielts" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Minimum PTE</span>
              <input name="min_pte" className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">IELTS waiver *</span>
              <select name="ielts_waiver" required className="h-10 rounded-md border border-zinc-300 bg-white px-3">
                <option value="">Select</option>
                <option value="none">none</option>
                <option value="b_or_above">b_or_above</option>
                <option value="c_plus_limited">c_plus_limited</option>
                <option value="Yes">Yes</option>
                <option value="Yes with conditions">Yes with conditions</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Fee *</span>
              <input name="fee" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Accepted gap *</span>
              <input name="accepted_gap" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">CAS deposit *</span>
              <select name="cas_deposit" required className="h-10 rounded-md border border-zinc-300 bg-white px-3">
                <option value="">Select</option>
                <option value="not_required">not_required</option>
                <option value="required">required</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">CAS deposit amount *</span>
              <input name="cas_deposit_amount" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-800">Scholarship up to *</span>
              <input name="scholarship_upto" required className="h-10 rounded-md border border-zinc-300 bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium text-zinc-800">Course description *</span>
              <textarea name="courseDescription" required rows={4} className="rounded-md border border-zinc-300 bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium text-zinc-800">Intakes (months) *</span>
              <input
                name="intakes"
                required
                placeholder="September, November"
                className="h-10 rounded-md border border-zinc-300 bg-white px-3"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save manual course"}
            </Button>
          </div>
        </form>
      )}

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      {result ? (
        <div className="grid gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p>
            Import finished. <span className="font-semibold">{result.inserted}</span> course
            {result.inserted === 1 ? " was" : "s were"} added and{" "}
            <span className="font-semibold">{result.updated}</span> existing course
            {result.updated === 1 ? " was" : "s were"} updated.
            {result.failed > 0 ? (
              <>
                {" "}
                <span className="font-semibold">{result.failed}</span> row{result.failed === 1 ? "" : "s"} could not be imported.
              </>
            ) : null}
          </p>
          {result.errors.length > 0 ? (
            <div className="max-h-52 overflow-auto rounded-md border border-red-200 bg-white p-2 text-xs text-red-700">
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
