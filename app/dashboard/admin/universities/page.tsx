import { Trash2 } from "lucide-react";
import { UniversityCourseForm } from "@/components/university-form";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { IntakeBadge } from "@/components/ui/badge";
import { deleteCourseAction, updateIntakeStatusAction } from "@/lib/actions/universities";
import { requireRole } from "@/lib/auth";
import { currencyGBP, titleCase } from "@/lib/format";
import type { Course, Intake, IntakeStatus, University } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CourseRow = Course & { intakes: Intake[] };
type UniversityRow = University & { courses: CourseRow[] };
const intakeStatuses: IntakeStatus[] = ["open", "closing", "closed"];

export default async function UniversitiesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: universities = [] } = await supabase
    .from("universities")
    .select("*, courses(*, intakes(*))")
    .order("name");

  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">University Management</h1>
        <p className="mt-1 text-sm text-zinc-600">Admin CRUD for universities, courses, fees, requirements, and intake availability.</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold">Add university course</h2>
        <UniversityCourseForm />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-lg font-semibold">Courses and intakes</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {(universities as UniversityRow[]).map((university) => (
            <article key={university.id} className="p-5">
              <div className="mb-4">
                <h3 className="font-semibold">{university.name}</h3>
                <p className="text-sm text-zinc-500">{university.location}{university.ranking ? ` · Ranking ${university.ranking}` : ""}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Course</th>
                      <th className="px-4 py-3 font-medium">Requirements</th>
                      <th className="px-4 py-3 font-medium">Fees</th>
                      <th className="px-4 py-3 font-medium">Intakes</th>
                      <th className="px-4 py-3 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {university.courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-4 py-4">
                          <p className="font-medium">{course.name}</p>
                          <p className="text-xs text-zinc-500">{course.degree} · {course.duration} · {course.field}</p>
                        </td>
                        <td className="px-4 py-4">
                          GPA {course.min_gpa}
                          <br />
                          IELTS {course.min_ielts}
                          <br />
                          Waiver {formatWaiver(course.ielts_waiver)}
                        </td>
                        <td className="px-4 py-4">{currencyGBP(course.tuition_fee)}</td>
                        <td className="px-4 py-4">
                          <div className="grid gap-2">
                            {course.intakes.map((intake) => (
                              <form key={intake.id} action={updateIntakeStatusAction} className="flex items-center gap-2">
                                <input type="hidden" name="intakeId" value={intake.id} />
                                <span className="w-10 font-medium">{intake.intake}</span>
                                <IntakeBadge status={intake.status} />
                                <Select name="status" defaultValue={intake.status} className="h-9">
                                  {intakeStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                                </Select>
                                <Button variant="secondary" className="h-9">Save</Button>
                              </form>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <form action={deleteCourseAction}>
                            <input type="hidden" name="courseId" value={course.id} />
                            <Button variant="danger" className="h-9"><Trash2 size={15} /> Delete</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatWaiver(value: Course["ielts_waiver"]) {
  if (value === "b_or_above") return "B or above";
  if (value === "c_plus_limited") return "C+ limited";
  return "No";
}
