"use client";

import { useMemo, useState } from "react";
import { CourseRowActions } from "@/components/course-row-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { IntakeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { bulkUpdateCourseIntakesAction, deleteManyCoursesAction } from "@/lib/actions/universities";
import { currencyGBP } from "@/lib/format";
import type { Course, Intake, IntakeName } from "@/lib/database.types";

export type CourseWithIntakesRow = Course & { intakes: Intake[] };

const intakeNames: IntakeName[] = ["Jan", "May", "Sep", "Nov"];

function formatWaiver(value: Course["ielts_waiver"]) {
  if (value === "b_or_above") return "B or above";
  if (value === "c_plus_limited") return "C+ limited";
  if (value === "none") return "No";
  return "—";
}

function formatCasDeposit(course: Pick<Course, "cas_deposit" | "cas_deposit_amount">) {
  if (course.cas_deposit !== "required") return "Not required";
  if (course.cas_deposit_amount != null) return `Required (${currencyGBP(course.cas_deposit_amount)})`;
  return "Required";
}

export function UniversityCoursesTable({
  courses,
  selectMode,
  onSelectModeChange,
}: {
  courses: CourseWithIntakesRow[];
  selectMode: boolean;
  onSelectModeChange: (enabled: boolean) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = useMemo(
    () => courses.length > 0 && courses.every((course) => selectedIds.includes(course.id)),
    [courses, selectedIds],
  );

  function toggleCourse(courseId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? (current.includes(courseId) ? current : [...current, courseId]) : current.filter((id) => id !== courseId),
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? courses.map((course) => course.id) : []);
  }

  return (
    <div className="overflow-x-auto">
      {selectMode ? (
        <div className="grid gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.currentTarget.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Select all
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600">{selectedIds.length} selected</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedIds([]);
                  onSelectModeChange(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <form action={bulkUpdateCourseIntakesAction} className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_180px_auto] md:items-end">
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="courseIds" value={id} />
              ))}
              <div className="grid gap-2">
                <span className="text-sm font-medium text-zinc-800">Set intakes for selected courses</span>
                <div className="flex flex-wrap gap-3">
                  {intakeNames.map((name) => (
                    <label key={name} className="inline-flex items-center gap-2 text-sm text-zinc-700">
                      <input name={`bulk_intake_${name}`} type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="grid gap-2 text-sm font-medium text-zinc-800">
                Status
                <Select name="bulk_intake_status" defaultValue="open" className="h-10 bg-white">
                  <option value="open">Open</option>
                  <option value="closing">Closing</option>
                  <option value="closed">Closed</option>
                </Select>
              </label>
              <Button type="submit" className="h-10" disabled={selectedIds.length === 0}>
                Apply intakes
              </Button>
            </form>

            <form action={deleteManyCoursesAction} className="flex justify-end">
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="courseIds" value={id} />
              ))}
              <ConfirmSubmitButton
                message={`Delete ${selectedIds.length} selected course(s)? This cannot be undone.`}
                className="h-10"
              >
                Delete selected ({selectedIds.length})
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
      ) : null}
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            {selectMode ? <th className="w-10 px-2 py-3 font-medium" aria-label="Select course" /> : null}
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Requirements</th>
            <th className="px-4 py-3 font-medium">Fee</th>
            <th className="px-4 py-3 font-medium">Gap</th>
            <th className="px-4 py-3 font-medium">CAS</th>
            <th className="px-4 py-3 font-medium">Scholarship</th>
            <th className="px-4 py-3 font-medium">Intakes</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {courses.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-zinc-500" colSpan={selectMode ? 9 : 8}>
                No courses for this university yet. Use the Import courses CSV page to add in bulk.
              </td>
            </tr>
          ) : null}
          {courses.map((course) => (
            <tr key={course.id}>
              {selectMode ? (
                <td className="px-2 py-4 align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(course.id)}
                    onChange={(e) => toggleCourse(course.id, e.currentTarget.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                    aria-label={`Select ${course.name ?? "course"}`}
                  />
                </td>
              ) : null}
              <td className="px-4 py-4">
                <p className="font-medium">{course.name ?? "—"}</p>
                <p className="text-xs text-zinc-500">
                  {[course.degree, course.duration, course.field].filter(Boolean).join(" · ") || "—"}
                </p>
              </td>
              <td className="px-4 py-4">
                GPA {course.min_gpa ?? "—"}
                <br />
                IELTS {course.min_ielts ?? "—"}
                <br />
                Waiver {formatWaiver(course.ielts_waiver)}
              </td>
              <td className="px-4 py-4">{currencyGBP(course.fee)}</td>
              <td className="px-4 py-4 text-zinc-700">{course.accepted_gap?.trim() || "—"}</td>
              <td className="px-4 py-4">{formatCasDeposit(course)}</td>
              <td className="px-4 py-4">{course.scholarship_upto != null ? `Up to ${currencyGBP(course.scholarship_upto)}` : "—"}</td>
              <td className="px-4 py-4">
                {course.intakes.length === 0 ? (
                  <span className="text-zinc-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {course.intakes.map((intake) => (
                      <span
                        key={intake.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs"
                      >
                        <span className="font-medium">{intake.intake}</span>
                        <IntakeBadge status={intake.status} />
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-zinc-400">Use Select courses to update intakes in bulk.</p>
              </td>
              <td className="px-4 py-4 align-top">
                {!selectMode ? <CourseRowActions course={course} /> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
