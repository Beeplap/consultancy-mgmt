"use client";

import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { deleteCourseAction, updateCourseAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import type { Course } from "@/lib/database.types";

const standardDegrees = ["BSc", "BA", "BEng", "MSc", "MBA"];

function degreeSelectOptions(course: Course) {
  const d = course.degree?.trim() ?? "";
  const needsExtra = Boolean(d && !standardDegrees.includes(d));
  return (
    <>
      <option value="">—</option>
      {standardDegrees.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {needsExtra ? <option value={d}>{d}</option> : null}
    </>
  );
}

export function CourseRowActions({ course }: { course: Course }) {
  const [casDeposit, setCasDeposit] = useState<Course["cas_deposit"]>(course.cas_deposit);

  return (
    <details className="relative z-30">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Course actions</span>
        <MoreVertical size={18} aria-hidden />
      </summary>
      <div className="absolute right-0 z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] max-h-[min(32rem,70vh)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Edit course</p>
        <form action={updateCourseAction} className="mb-4 grid gap-2 border-b border-zinc-100 pb-4">
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="Course name">
            <Input name="courseName" defaultValue={course.name ?? ""} />
          </Field>
          <Field label="Degree">
            <Select name="degree" defaultValue={course.degree ?? ""}>
              {degreeSelectOptions(course)}
            </Select>
          </Field>
          <Field label="Duration">
            <Input name="duration" defaultValue={course.duration ?? ""} />
          </Field>
          <Field label="Field">
            <Input name="field" defaultValue={course.field ?? ""} />
          </Field>
          <Field label="Minimum GPA">
            <Input name="min_gpa" type="number" step="0.1" defaultValue={course.min_gpa ?? ""} />
          </Field>
          <Field label="Minimum IELTS">
            <Input name="min_ielts" type="number" step="0.1" defaultValue={course.min_ielts ?? ""} />
          </Field>
          <Field label="IELTS waiver">
            <Select name="ielts_waiver" defaultValue={course.ielts_waiver ?? ""}>
              <option value="">—</option>
              <option value="none">No waiver</option>
              <option value="b_or_above">B or above</option>
              <option value="c_plus_limited">C+ limited</option>
            </Select>
          </Field>
          <Field label="Fee (£)">
            <Input name="fee" type="number" defaultValue={course.fee ?? ""} />
          </Field>
          <Field label="Accepted study gap">
            <Input name="accepted_gap" defaultValue={course.accepted_gap ?? ""} />
          </Field>
          <Field label="CAS deposit">
            <Select name="cas_deposit" value={casDeposit} onChange={(e) => setCasDeposit(e.target.value as Course["cas_deposit"])}>
              <option value="not_required">Not required</option>
              <option value="required">Required</option>
            </Select>
          </Field>
          {casDeposit === "required" ? (
            <Field label="CAS deposit amount (£)">
              <Input name="cas_deposit_amount" type="number" min="0" defaultValue={course.cas_deposit_amount ?? ""} />
            </Field>
          ) : null}
          <Field label="Scholarship up to (£)">
            <Input name="scholarship_upto" type="number" defaultValue={course.scholarship_upto ?? ""} />
          </Field>
          <Button type="submit" variant="secondary" className="h-9 w-full">
            Save course
          </Button>
        </form>
        <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Danger zone</p>
        <form action={deleteCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmSubmitButton message={`Delete ${course.name ?? "this course"}?`} className="h-9 w-full justify-center">
            <Trash2 size={15} />
            Delete course
          </ConfirmSubmitButton>
        </form>
      </div>
    </details>
  );
}
