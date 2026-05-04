"use client";

import type { EnglishGrade, IntakeName } from "@/lib/database.types";
import { Field, Input, Select } from "@/components/ui/field";

type MatchFiltersFormProps = {
  filters: {
    gpa?: string;
    englishGrade?: EnglishGrade;
    waiver?: string;
    ielts?: string;
    budget?: string;
    intake?: IntakeName;
    course?: string;
    universityId?: string;
    sort?: string;
    _match?: string;
  };
  universities: Array<{ id: string; name: string | null }>;
};

const englishGrades: EnglishGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
const intakes: IntakeName[] = ["Jan", "May", "Sep", "Nov"];

export function MatchFiltersForm({ filters, universities }: MatchFiltersFormProps) {
  const sortedUniversities = [...universities].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  return (
    <form method="get" action="/dashboard/course-recommendations" className="grid gap-5 border-b border-zinc-200 p-4 md:p-5">
      <input type="hidden" name="_match" value="1" />

      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800">
        <input name="waiver" type="checkbox" value="1" defaultChecked={filters.waiver === "1"} className="size-4 accent-black" />
        Apply with waiver
      </label>

      {/* Row 1: five compact filters — even columns, no cramped sixth cell */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="GPA">
          <Input name="gpa" type="number" step="0.1" min="0" max="100" defaultValue={filters.gpa} placeholder="75" className="h-10 w-full" />
        </Field>
        <Field label="English Grade">
          <Select name="englishGrade" defaultValue={filters.englishGrade ?? ""} className="h-10 w-full">
            <option value="">Select</option>
            {englishGrades.map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </Select>
        </Field>
        <Field label="IELTS">
          <Input name="ielts" type="number" step="0.1" min="0" max="9" defaultValue={filters.ielts} placeholder="6.0" className="h-10 w-full" />
        </Field>
        <Field label="Budget (£)">
          <Input name="budget" type="number" min="0" defaultValue={filters.budget} placeholder="12000" className="h-10 w-full" />
        </Field>
        <Field label="Intake">
          <Select name="intake" defaultValue={filters.intake ?? ""} className="h-10 w-full">
            <option value="">Any</option>
            {intakes.map((intake) => (
              <option key={intake}>{intake}</option>
            ))}
          </Select>
        </Field>
        <Field label="University">
          <Select name="universityId" defaultValue={filters.universityId ?? ""} className="h-10 w-full">
            <option value="">All universities</option>
            {sortedUniversities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.trim() || "Unnamed university"}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Search">
              <Input
                name="course"
                defaultValue={filters.course}
                placeholder="Course, degree, field, city, university..."
                className="h-10 w-full bg-white"
              />
            </Field>
          </div>
          <Field label="Sort by">
            <Select name="sort" defaultValue={filters.sort ?? "relevance"} className="h-10 w-full bg-white">
              <option value="relevance">Best relevance</option>
              <option value="university_az">University A-Z</option>
              <option value="fee_low_high">Fee low-high</option>
              <option value="fee_high_low">Fee high-low</option>
              <option value="match_high_low">Match high-low</option>
            </Select>
          </Field>
          <button
            type="submit"
            className="h-10 w-full shrink-0 rounded-md bg-black px-8 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto sm:min-w-28"
          >
            Match
          </button>
          <a
            href="/dashboard/course-recommendations"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 sm:w-auto"
          >
            Reset
          </a>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Each course is one row; all intakes are grouped in the Intakes column. Click{" "}
        <span className="font-medium text-zinc-600">Match</span> to filter. Budget vs course fee: fee ≤ your budget when set.
      </p>
    </form>
  );
}
