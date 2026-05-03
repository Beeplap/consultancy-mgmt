import { MoreVertical, Trash2 } from "lucide-react";
import { UniversityCourseForm } from "@/components/university-form";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { IntakeBadge } from "@/components/ui/badge";
import {
  createUniversityAction,
  deleteCourseAction,
  deleteUniversityAction,
  updateIntakeStatusAction,
  updateUniversityAction,
} from "@/lib/actions/universities";
import { requireRole } from "@/lib/auth";
import { currencyGBP, titleCase } from "@/lib/format";
import type { Course, CasDepositPolicy, Intake, IntakeStatus, University } from "@/lib/database.types";
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
    .order("name", { nullsFirst: false });

  const uniList = (universities as UniversityRow[]).map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">University Management</h1>
        <p className="mt-1 text-sm text-zinc-600">Universities, courses, fees, intakes, and requirements. All fields are optional unless you need them for matching.</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Add university</h2>
        <p className="mb-4 text-sm text-zinc-600">Create an empty university record, then attach courses below or leave blank and create one when adding a course.</p>
        <form action={createUniversityAction} className="grid gap-4 md:grid-cols-4 md:items-end">
          <Field label="Name">
            <Input name="name" />
          </Field>
          <Field label="UK city">
            <Input name="location" />
          </Field>
          <Field label="Ranking">
            <Input name="ranking" type="number" min="1" />
          </Field>
          <div className="flex justify-end md:justify-start">
            <Button type="submit" variant="secondary" className="h-10">
              Save university
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold">Add course to a university</h2>
        <UniversityCourseForm universities={uniList} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-lg font-semibold">Courses and intakes</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {(universities as UniversityRow[]).map((university) => (
            <article key={university.id} className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{university.name?.trim() || "Unnamed university"}</h3>
                  <p className="text-sm text-zinc-500">
                    {[university.location, university.ranking != null ? `Ranking ${university.ranking}` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <details className="group relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                    <span className="sr-only">University actions</span>
                    <MoreVertical size={18} aria-hidden />
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Edit university</p>
                    <form action={updateUniversityAction} className="mb-4 grid gap-2 border-b border-zinc-100 pb-4">
                      <input type="hidden" name="universityId" value={university.id} />
                      <Field label="Name">
                        <Input name="name" defaultValue={university.name ?? ""} />
                      </Field>
                      <Field label="UK city">
                        <Input name="location" defaultValue={university.location ?? ""} />
                      </Field>
                      <Field label="Ranking">
                        <Input name="ranking" type="number" min="1" defaultValue={university.ranking ?? ""} />
                      </Field>
                      <Button type="submit" variant="secondary" className="h-9 w-full">
                        Save changes
                      </Button>
                    </form>
                    <form action={deleteUniversityAction}>
                      <input type="hidden" name="universityId" value={university.id} />
                      <ConfirmSubmitButton
                        message={`Delete ${university.name?.trim() || "this university"} and all of its courses?`}
                        className="h-9 w-full justify-center"
                      >
                        <Trash2 size={15} />
                        Delete university
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </details>
              </div>
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
                      <th className="px-4 py-3 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {university.courses.map((course) => (
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
                        <td className="px-4 py-4">{formatCasDeposit(course.cas_deposit)}</td>
                        <td className="px-4 py-4">{course.scholarship_upto != null ? `Up to ${currencyGBP(course.scholarship_upto)}` : "—"}</td>
                        <td className="px-4 py-4">
                          {course.intakes.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            <div className="grid gap-2">
                              {course.intakes.map((intake) => (
                                <form key={intake.id} action={updateIntakeStatusAction} className="flex items-center gap-2">
                                  <input type="hidden" name="intakeId" value={intake.id} />
                                  <span className="w-10 font-medium">{intake.intake}</span>
                                  <IntakeBadge status={intake.status} />
                                  <Select name="status" defaultValue={intake.status} className="h-9">
                                    {intakeStatuses.map((status) => (
                                      <option key={status} value={status}>
                                        {titleCase(status)}
                                      </option>
                                    ))}
                                  </Select>
                                  <Button variant="secondary" className="h-9">
                                    Save
                                  </Button>
                                </form>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <form action={deleteCourseAction}>
                            <input type="hidden" name="courseId" value={course.id} />
                            <ConfirmSubmitButton message={`Delete ${course.name ?? "this course"}?`} className="h-9">
                              <Trash2 size={15} />
                              Delete
                            </ConfirmSubmitButton>
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
  if (value === "none") return "No";
  return "—";
}

function formatCasDeposit(value: CasDepositPolicy) {
  if (value === "required") return "Required";
  return "Not required";
}
