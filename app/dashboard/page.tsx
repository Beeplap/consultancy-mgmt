import Link from "next/link";
import { ApplicationStatus } from "@prisma/client";
import { Download, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { currencyGBP, titleCase } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: ApplicationStatus;
    intake?: "JAN" | "MAY" | "SEP";
    course?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const where = {
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.intake ? { preferredIntake: filters.intake } : {}),
    ...(filters.course ? { courseInterest: { contains: filters.course, mode: "insensitive" as const } } : {}),
  };

  const [students, totalStudents, applicationsInProgress, offersReceived, courses] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { applications: { include: { course: { include: { fee: true } } } } },
    }),
    prisma.student.count(),
    prisma.student.count({ where: { status: { in: ["NEW", "APPLIED"] } } }),
    prisma.student.count({ where: { status: "OFFER" } }),
    prisma.course.findMany({ select: { field: true }, distinct: ["field"], orderBy: { field: "asc" } }),
  ]);

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Track students, applications, offers, and eligibility recommendations.</p>
        </div>
        <Link href="/dashboard/students/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-zinc-800">
          <UserPlus size={16} />
          Add Student
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Students", totalStudents],
          ["Applications in Progress", applicationsInProgress],
          ["Offers Received", offersReceived],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <form className="grid gap-4 border-b border-zinc-200 p-5 md:grid-cols-[1fr_180px_180px_180px_auto]">
          <Field label="Search">
            <Input name="q" defaultValue={filters.q} placeholder="Name or email" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </Select>
          </Field>
          <Field label="Intake">
            <Select name="intake" defaultValue={filters.intake ?? ""}>
              <option value="">All</option><option value="JAN">Jan</option><option value="MAY">May</option><option value="SEP">Sep</option>
            </Select>
          </Field>
          <Field label="Course">
            <Select name="course" defaultValue={filters.course ?? ""}>
              <option value="">All</option>
              {courses.map((course) => <option key={course.field} value={course.field}>{course.field}</option>)}
            </Select>
          </Field>
          <div className="flex items-end"><Button><Search size={16} />Filter</Button></div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Preferred Course</th>
                <th className="px-5 py-3 font-medium">IELTS/PTE</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/students/${student.id}`} className="font-medium text-black hover:underline">{student.name}</Link>
                    <p className="text-xs text-zinc-500">{student.email}</p>
                  </td>
                  <td className="px-5 py-4">{student.courseInterest}</td>
                  <td className="px-5 py-4">{student.englishScore.toFixed(1)}</td>
                  <td className="px-5 py-4">{currencyGBP(student.budget)}</td>
                  <td className="px-5 py-4"><StatusBadge status={student.status} /></td>
                  <td className="px-5 py-4">
                    <a href={`/api/students/${student.id}/report`} className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
                      <Download size={15} /> PDF
                    </a>
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr><td className="px-5 py-10 text-center text-zinc-500" colSpan={6}>No students match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
