import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { IntakeBadge, StatusBadge } from "@/components/ui/badge";
import { updateStudentStatusAction } from "@/lib/actions/students";
import { currencyGBP, titleCase } from "@/lib/format";
import { getRankedCourseRecommendations } from "@/lib/matching";
import type { StudentStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statuses: StudentStatus[] = ["new", "applied", "offer", "visa", "enrolled"];

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();

  if (!student) notFound();

  const recommendations = await getRankedCourseRecommendations(supabase, student.id);

  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">{student.email} · {student.phone} · {student.nationality}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Status</p>
          <div className="mt-3"><StatusBadge status={student.status} /></div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Academic</p>
          <p className="mt-2 font-semibold">{titleCase(student.qualification)} · {student.gpa}%</p>
          <p className="text-xs text-zinc-500">{student.backlogs} backlogs · {student.year}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">IELTS</p>
          <p className="mt-2 font-semibold">{student.ielts.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Preferences</p>
          <p className="mt-2 font-semibold">{student.preferred_course}</p>
          <p className="text-xs text-zinc-500">{student.intake} · {student.preferred_city || "Any city"} · {currencyGBP(student.budget)}</p>
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-5">
            <h2 className="text-lg font-semibold">Recommended Courses</h2>
            <p className="mt-1 text-sm text-zinc-600">Filtered by Supabase query data, then sorted by GPA, IELTS, budget, intake, and preference score.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">University</th>
                  <th className="px-5 py-3 font-medium">Course</th>
                  <th className="px-5 py-3 font-medium">Tuition</th>
                  <th className="px-5 py-3 font-medium">Intake</th>
                  <th className="px-5 py-3 font-medium">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recommendations.map((recommendation) => (
                  <tr key={`${recommendation.course.id}-${recommendation.intake.id}`}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{recommendation.course.universities?.name}</p>
                      <p className="text-xs text-zinc-500">{recommendation.course.universities?.location}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p>{recommendation.course.name}</p>
                      <p className="text-xs text-zinc-500">{recommendation.course.degree} · {recommendation.course.duration}</p>
                    </td>
                    <td className="px-5 py-4">{currencyGBP(recommendation.course.tuition_fee)}</td>
                    <td className="px-5 py-4">
                      <p className="mb-1 font-medium">{recommendation.intake.intake}</p>
                      <IntakeBadge status={recommendation.intake.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={recommendation.score >= 80 ? "font-semibold text-green-700" : "font-semibold text-zinc-900"}>{recommendation.score}%</span>
                    </td>
                  </tr>
                ))}
                {recommendations.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-500">No eligible recommendations yet. Check GPA, IELTS, budget, and intake availability.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold">Update status</h2>
            <form action={updateStudentStatusAction} className="mt-4 grid gap-3">
              <input type="hidden" name="studentId" value={student.id} />
              <Field label="Application status">
                <Select name="status" defaultValue={student.status}>
                  {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </Select>
              </Field>
              <Button>Save status</Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
