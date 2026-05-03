"use client";

import { useState } from "react";
import { PresetOrManualField } from "@/components/preset-or-manual-field";
import type { MergedCatalogPresetOptions } from "@/lib/catalog-custom-presets";
import { createUniversityCourseAction } from "@/lib/actions/universities";
import { universityCoverAcceptAttr } from "@/lib/university-cover";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type UniversityOption = { id: string; name: string | null };

export function UniversityCourseForm({
  universities,
  mergedPresets,
}: {
  universities: UniversityOption[];
  mergedPresets: MergedCatalogPresetOptions;
}) {
  const [universityId, setUniversityId] = useState("");
  const [casDeposit, setCasDeposit] = useState<"not_required" | "required">("not_required");
  const isNewUniversity = universityId === "";

  return (
    <form action={createUniversityCourseAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="University">
          <Select name="university_id" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
            <option value="">New university (fill details below)</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.trim() || "Unnamed university"}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {isNewUniversity ? (
        <>
          <p className="text-xs text-zinc-500">
            All fields are optional. Add university details below if you are creating a new record; otherwise leave blank.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="University name">
              <Input name="universityName" placeholder="New university" />
            </Field>
            <Field label="UK city">
              <Input name="location" placeholder="e.g. Liverpool" />
            </Field>
            <Field label="Ranking">
              <Input name="ranking" type="number" min="1" />
            </Field>
          </div>
          <Field label="University description (optional, new university only)">
            <Textarea
              name="universityDescription"
              placeholder="Shown for every course from this university on Match Student. Line breaks are kept."
              rows={4}
            />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-zinc-800">University photo (optional)</span>
            <p className="text-xs text-zinc-500">
              One image for the institution (shows on Match Student when a course is expanded). JPG, PNG, WebP, GIF — max 2MB. Bucket{" "}
              <code className="rounded bg-zinc-100 px-1 py-px text-[11px]">university-covers</code>.
            </p>
            <input
              name="universityCover"
              type="file"
              accept={universityCoverAcceptAttr()}
              className="max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 focus:border-black focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-500">This course will be added to the university you selected above.</p>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <PresetOrManualField
          name="courseName"
          label="Course"
          options={mergedPresets.coursePresets}
          placeholderPreset="Pick a programme or search…"
          placeholderManual="Type course name exactly as it should appear"
        />
        <PresetOrManualField
          name="degree"
          label="Degree"
          options={mergedPresets.degreePresets}
          placeholderPreset="Pick or search degree type…"
          placeholderManual="e.g. BSc (Hons)"
        />
        <PresetOrManualField
          name="duration"
          label="Duration"
          options={mergedPresets.durationPresets}
          placeholderPreset="Pick typical duration…"
          placeholderManual="e.g. 1 year part-time"
        />
        <PresetOrManualField
          name="field"
          label="Field"
          options={mergedPresets.fieldPresets}
          placeholderPreset="Pick subject area…"
          placeholderManual="e.g. IT, Business"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Minimum GPA">
          <Input name="min_gpa" type="number" step="0.1" />
        </Field>
        <Field label="Minimum IELTS">
          <Input name="min_ielts" type="number" step="0.1" />
        </Field>
        <Field label="IELTS waiver">
          <Select name="ielts_waiver" defaultValue="">
            <option value="">—</option>
            <option value="none">No waiver</option>
            <option value="b_or_above">B or above</option>
            <option value="c_plus_limited">C+ limited</option>
          </Select>
        </Field>
        <Field label="Fee">
          <Input name="fee" type="number" placeholder="GBP" />
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Accepted study gap">
          <Input name="accepted_gap" placeholder="e.g. Up to 2 years" />
        </Field>
        <Field label="Scholarship up to (£)">
          <Input name="scholarship_upto" type="number" placeholder="Optional cap" />
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
              <Input name="cas_deposit_amount" type="number" min="0" placeholder="e.g. 6500" />
            </Field>
          ) : null}
        </div>
      </div>
      <Field label="Course description (optional)">
        <Textarea
          name="courseDescription"
          placeholder="Per course notes. Line breaks are kept."
          rows={4}
          className="min-h-[6.5rem]"
        />
      </Field>
      <div className="grid gap-3">
        <span className="text-sm font-medium text-zinc-800">Intakes (select any that apply)</span>
        <div className="flex flex-wrap gap-6">
          {(["Jan", "May", "Sep"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name={`intake_${m}`} className="h-4 w-4 rounded border-zinc-300" />
              {m}
            </label>
          ))}
        </div>
        <Field label="Status for selected intakes">
          <Select name="intake_status" defaultValue="open">
            <option value="open">Open</option>
            <option value="closing">Closing</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Add course to university</Button>
      </div>
    </form>
  );
}
