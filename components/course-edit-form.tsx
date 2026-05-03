"use client";

import { useState } from "react";
import { PresetOrManualField } from "@/components/preset-or-manual-field";
import { updateUniversityCourseAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { COURSE_NAME_PRESETS, DEGREE_PRESETS, DURATION_PRESETS, STUDY_FIELD_PRESETS } from "@/lib/course-form-presets";
import type { Course, Intake, IntakeName, IntakeStatus } from "@/lib/database.types";

type UniversityOption = { id: string; name: string | null };
type CourseWithIntakes = Course & { intakes: Intake[] };

const intakeOrder: Record<IntakeName, number> = { Jan: 0, May: 1, Sep: 2 };

function defaultIntakeStatus(intakes: Intake[]): IntakeStatus {
  if (intakes.length === 0) return "open";
  const sorted = [...intakes].sort((a, b) => intakeOrder[a.intake] - intakeOrder[b.intake]);
  return sorted[0].status;
}

export function CourseEditForm({ course, universities }: { course: CourseWithIntakes; universities: UniversityOption[] }) {
  const [casDeposit, setCasDeposit] = useState<"not_required" | "required">(course.cas_deposit);

  return (
    <form action={updateUniversityCourseAction} className="grid gap-5">
      <input type="hidden" name="courseId" value={course.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="University">
          <Select name="university_id" defaultValue={course.university_id}>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.trim() || "Unnamed university"}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-zinc-500">Move this course to another university if needed. All fields remain optional.</p>

      <div className="grid gap-4 md:grid-cols-4">
        <PresetOrManualField
          name="courseName"
          label="Course"
          options={COURSE_NAME_PRESETS}
          defaultValue={course.name}
          placeholderPreset="Pick or search programme…"
          placeholderManual="Type course name exactly as shown"
        />
        <PresetOrManualField
          name="degree"
          label="Degree"
          options={DEGREE_PRESETS}
          defaultValue={course.degree}
          placeholderPreset="Pick or search degree type…"
          placeholderManual="Custom degree abbreviation"
        />
        <PresetOrManualField
          name="duration"
          label="Duration"
          options={DURATION_PRESETS}
          defaultValue={course.duration}
          placeholderPreset="Pick typical duration…"
          placeholderManual="e.g. 1 year"
        />
        <PresetOrManualField
          name="field"
          label="Field"
          options={STUDY_FIELD_PRESETS}
          defaultValue={course.field}
          placeholderPreset="Pick subject area…"
          placeholderManual="e.g. IT, Business"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
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
        <Field label="Fee">
          <Input name="fee" type="number" placeholder="GBP" defaultValue={course.fee ?? ""} />
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Accepted study gap">
          <Input name="accepted_gap" defaultValue={course.accepted_gap ?? ""} placeholder="e.g. Up to 2 years" />
        </Field>
        <Field label="Scholarship up to (£)">
          <Input name="scholarship_upto" type="number" placeholder="Optional cap" defaultValue={course.scholarship_upto ?? ""} />
        </Field>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 md:p-5">
        <p className="mb-4 text-sm font-medium text-zinc-800">CAS deposit</p>
        <div
          className={
            casDeposit === "required"
              ? "grid gap-5 sm:grid-cols-2 sm:gap-8 sm:items-start"
              : "max-w-md"
          }
        >
          <Field label="Requirement">
            <Select name="cas_deposit" value={casDeposit} onChange={(e) => setCasDeposit(e.target.value as "not_required" | "required")}>
              <option value="not_required">Not required</option>
              <option value="required">Required</option>
            </Select>
          </Field>
          {casDeposit === "required" ? (
            <Field label="Deposit amount (£)">
              <Input name="cas_deposit_amount" type="number" min="0" placeholder="e.g. 6500" defaultValue={course.cas_deposit_amount ?? ""} />
            </Field>
          ) : null}
        </div>
      </div>
      <Field label="Course description (optional)">
        <Textarea
          name="courseDescription"
          defaultValue={course.description ?? ""}
          placeholder="Per course notes. Line breaks are kept."
          rows={4}
          className="min-h-[6.5rem]"
        />
      </Field>
      <div className="grid gap-3">
        <span className="text-sm font-medium text-zinc-800">Intakes (select any that apply)</span>
        <p className="text-xs text-zinc-500">
          Checked intakes are kept or created; unchecked ones are removed. One status applies to all selected intakes (same as adding a course).
        </p>
        <div className="flex flex-wrap gap-6">
          {(["Jan", "May", "Sep"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name={`intake_${m}`}
                defaultChecked={course.intakes.some((i) => i.intake === m)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {m}
            </label>
          ))}
        </div>
        <Field label="Status for selected intakes">
          <Select name="intake_status" defaultValue={defaultIntakeStatus(course.intakes)}>
            <option value="open">Open</option>
            <option value="closing">Closing</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
