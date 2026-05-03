import { CourseRowActions } from "@/components/course-row-actions";
import { IntakeBadge } from "@/components/ui/badge";
import { currencyGBP } from "@/lib/format";
import type { Course, Intake } from "@/lib/database.types";

export type CourseWithIntakesRow = Course & { intakes: Intake[] };

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

export function UniversityCoursesTable({ courses }: { courses: CourseWithIntakesRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
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
              <td className="px-4 py-6 text-center text-zinc-500" colSpan={8}>
                No courses for this university yet. Use Add course on the left.
              </td>
            </tr>
          ) : null}
          {courses.map((course) => (
            <tr key={course.id}>
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
                <p className="mt-2 text-xs text-zinc-400">Edit course to change intakes.</p>
              </td>
              <td className="px-4 py-4 align-top">
                <CourseRowActions course={course} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
