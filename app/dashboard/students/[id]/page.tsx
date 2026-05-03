import { notFound } from "next/navigation";
import { Download, RefreshCw, Star } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { IntakeBadge, StatusBadge } from "@/components/ui/badge";
import { addNoteAction, regenerateRecommendations, shortlistAction, updateStudentStatusAction } from "@/lib/actions/students";
import { currencyGBP, titleCase } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      counsellor: { select: { name: true } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      applications: {
        orderBy: [{ shortlisted: "desc" }, { matchScore: "desc" }],
        include: {
          intake: true,
          course: {
            include: {
              university: true,
              requirement: true,
              fee: true,
            },
          },
        },
      },
    },
  });

  if (!student) notFound();

  async function refreshAction() {
    "use server";
    await regenerateRecommendations(id);
  }

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">{student.email} · {student.phone} · {student.nationality}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/students/${student.id}/report`} className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50">
            <Download size={16} /> Export PDF
          </a>
          <form action={refreshAction}>
            <Button variant="secondary"><RefreshCw size={16} /> Refresh matches</Button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Status</p>
          <div className="mt-3"><StatusBadge status={student.status} /></div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Academic</p>
          <p className="mt-2 font-semibold">{titleCase(student.qualification)} · {student.gpa}%</p>
          <p className="text-xs text-zinc-500">{student.backlogs} backlogs · {student.academicYear}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">English</p>
          <p className="mt-2 font-semibold">{student.englishTest} {student.englishScore.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Preferences</p>
          <p className="mt-2 font-semibold">{student.courseInterest}</p>
          <p className="text-xs text-zinc-500">{student.preferredIntake} · {student.preferredCity || "Any city"} · {currencyGBP(student.budget)}</p>
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 p-5">
            <div>
              <h2 className="text-lg font-semibold">Recommended Universities</h2>
              <p className="mt-1 text-sm text-zinc-600">Sorted by GPA, English, budget, intake, and preference fit.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">University</th>
                  <th className="px-5 py-3 font-medium">Course</th>
                  <th className="px-5 py-3 font-medium">Tuition</th>
                  <th className="px-5 py-3 font-medium">Intake</th>
                  <th className="px-5 py-3 font-medium">Match</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {student.applications.map((application) => (
                  <tr key={application.id} className={application.shortlisted ? "bg-green-50/45" : ""}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{application.course.university.name}</p>
                      <p className="text-xs text-zinc-500">{application.course.university.location}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p>{application.course.name}</p>
                      <p className="text-xs text-zinc-500">{application.course.degreeType} · {application.course.duration}</p>
                    </td>
                    <td className="px-5 py-4">
                      {application.course.fee ? currencyGBP(application.course.fee.tuitionFee) : "Not set"}
                      {application.course.fee ? <p className="text-xs text-zinc-500">Deposit {currencyGBP(application.course.fee.depositAmount)}</p> : null}
                    </td>
                    <td className="px-5 py-4">
                      <p className="mb-1 font-medium">{application.intake.season}</p>
                      <IntakeBadge status={application.intake.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={application.matchScore >= 80 ? "font-semibold text-green-700" : "font-semibold text-zinc-900"}>{application.matchScore}%</span>
                    </td>
                    <td className="px-5 py-4">
                      {application.shortlisted ? (
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700"><Star size={15} fill="currentColor" /> Shortlisted</span>
                      ) : (
                        <form action={shortlistAction}>
                          <input type="hidden" name="applicationId" value={application.id} />
                          <input type="hidden" name="studentId" value={student.id} />
                          <Button variant="secondary" className="h-9"><Star size={15} /> Shortlist</Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {student.applications.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500">No eligible recommendations yet. Check requirements, budget, and open intake data.</td></tr>
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
                  {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </Select>
              </Field>
              <Button>Save status</Button>
            </form>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold">Notes</h2>
            <form action={addNoteAction} className="mt-4 grid gap-3">
              <input type="hidden" name="studentId" value={student.id} />
              <Textarea name="body" placeholder="Add counselling notes, document requests, or next steps." required />
              <Button>Add note</Button>
            </form>
            <div className="mt-5 grid gap-3">
              {student.notes.map((note) => (
                <article key={note.id} className="rounded-md border border-zinc-200 p-3">
                  <p className="text-sm leading-6">{note.body}</p>
                  <p className="mt-2 text-xs text-zinc-500">{note.author?.name ?? "System"} · {note.createdAt.toLocaleDateString("en-GB")}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
