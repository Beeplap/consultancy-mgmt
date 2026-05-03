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
    _match?: string;
  };
};

const englishGrades: EnglishGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
const intakes: IntakeName[] = ["Jan", "May", "Sep"];

export function MatchFiltersForm({ filters }: MatchFiltersFormProps) {
  return (
    <form method="get" action="/dashboard/course-recommendations" className="grid gap-5 border-b border-zinc-200 p-4 md:p-5">
      <input type="hidden" name="_match" value="1" />

      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800">
        <input name="waiver" type="checkbox" value="1" defaultChecked={filters.waiver === "1"} className="size-4 accent-black" />
        Apply with waiver
      </label>

      {/* Row 1: five compact filters — even columns, no cramped sixth cell */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            <Field label="Course">
              <Input
                name="course"
                defaultValue={filters.course}
                placeholder="e.g. IT, Business"
                className="h-10 w-full bg-white"
              />
            </Field>
          </div>
          <button
            type="submit"
            className="h-10 w-full shrink-0 rounded-md bg-black px-8 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto sm:min-w-[7rem]"
          >
            Match
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Each course is one row; all intakes are grouped in the Intakes column. Click{" "}
        <span className="font-medium text-zinc-600">Match</span> to filter. Budget vs course fee: fee ≤ your budget when set.
      </p>
    </form>
  );
}
