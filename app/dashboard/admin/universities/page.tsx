import { Trash2 } from "lucide-react";
import { IntakeStatus } from "@prisma/client";
import { UniversityCourseForm } from "@/components/university-form";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { IntakeBadge } from "@/components/ui/badge";
import { deleteCourseAction, updateIntakeStatusAction } from "@/lib/actions/universities";
import { requireAdmin } from "@/lib/auth";
import { currencyGBP, titleCase } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function UniversitiesPage() {
  await requireAdmin();
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      courses: {
        orderBy: { name: "asc" },
        include: { requirement: true, fee: true, intakes: { orderBy: { season: "asc" } } },
      },
    },
  });

  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">University Management</h1>
        <p className="mt-1 text-sm text-zinc-600">Admin CRUD for universities, courses, entry requirements, fees, payment plans, and intake availability.</p>
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
          {universities.map((university) => (
            <article key={university.id} className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{university.name}</h3>
                  <p className="text-sm text-zinc-500">{university.location}{university.ranking ? ` · Ranking ${university.ranking}` : ""}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Course</th>
                      <th className="px-4 py-3 font-medium">Requirements</th>
                      <th className="px-4 py-3 font-medium">Fees</th>
                      <th className="px-4 py-3 font-medium">Payment Plan</th>
                      <th className="px-4 py-3 font-medium">Intakes</th>
                      <th className="px-4 py-3 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {university.courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-4 py-4">
                          <p className="font-medium">{course.name}</p>
                          <p className="text-xs text-zinc-500">{course.degreeType} · {course.duration} · {course.field}</p>
                        </td>
                        <td className="px-4 py-4">
                          GPA {course.requirement?.minimumGpa ?? "N/A"}<br />
                          IELTS {course.requirement?.minimumIelts ?? "N/A"}
                        </td>
                        <td className="px-4 py-4">
                          {course.fee ? currencyGBP(course.fee.tuitionFee) : "N/A"}
                          {course.fee ? <p className="text-xs text-zinc-500">Deposit {currencyGBP(course.fee.depositAmount)}</p> : null}
                        </td>
                        <td className="max-w-xs px-4 py-4 text-zinc-600">{course.fee?.installmentDetails ?? "N/A"}</td>
                        <td className="px-4 py-4">
                          <div className="grid gap-2">
                            {course.intakes.map((intake) => (
                              <form key={intake.id} action={updateIntakeStatusAction} className="flex items-center gap-2">
                                <input type="hidden" name="intakeId" value={intake.id} />
                                <span className="w-10 font-medium">{intake.season}</span>
                                <IntakeBadge status={intake.status} />
                                <Select name="status" defaultValue={intake.status} className="h-9">
                                  {Object.values(IntakeStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
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
