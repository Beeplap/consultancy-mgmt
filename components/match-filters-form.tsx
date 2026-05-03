"use client";

import { useRef } from "react";
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
  };
};

const englishGrades: EnglishGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
const intakes: IntakeName[] = ["Jan", "May", "Sep"];

export function MatchFiltersForm({ filters }: MatchFiltersFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<number | null>(null);

  function submitNow() {
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function submitSoon() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => formRef.current?.requestSubmit(), 450);
  }

  return (
    <form ref={formRef} className="grid gap-3 border-b border-zinc-200 p-4 md:grid-cols-4 xl:grid-cols-[120px_145px_150px_120px_140px_120px_minmax(160px,1fr)]">
      <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 md:col-span-4 xl:col-span-7">
        <input name="waiver" type="checkbox" value="1" defaultChecked={filters.waiver === "1"} onChange={submitNow} className="size-4 accent-black" />
        Apply with waiver
      </label>

      <Field label="GPA">
        <Input name="gpa" type="number" step="0.1" min="0" max="100" defaultValue={filters.gpa} onChange={submitSoon} placeholder="75" className="h-9" />
      </Field>
      <Field label="English Grade">
        <Select name="englishGrade" defaultValue={filters.englishGrade ?? ""} onChange={submitNow} className="h-9">
          <option value="">Select</option>
          {englishGrades.map((grade) => (
            <option key={grade}>{grade}</option>
          ))}
        </Select>
      </Field>
      <Field label="IELTS">
        <Input name="ielts" type="number" step="0.1" min="0" max="9" defaultValue={filters.ielts} onChange={submitSoon} placeholder="6.0" className="h-9" />
      </Field>
      <Field label="Budget">
        <Input name="budget" type="number" min="0" defaultValue={filters.budget} onChange={submitSoon} placeholder="12000" className="h-9" />
      </Field>
      <Field label="Intake">
        <Select name="intake" defaultValue={filters.intake ?? ""} onChange={submitNow} className="h-9">
          <option value="">Any</option>
          {intakes.map((intake) => (
            <option key={intake}>{intake}</option>
          ))}
        </Select>
      </Field>
      <Field label="Course">
        <Input name="course" defaultValue={filters.course} onChange={submitSoon} placeholder="IT, Business" className="h-9" />
      </Field>
      <div className="flex items-end">
        <button type="submit" className="h-9 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-zinc-800">
          Match
        </button>
      </div>
    </form>
  );
}
