import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { currencyGBP, titleCase } from "@/lib/format";
import type { Course, IntakeName, Student, StudentStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: StudentStatus;
    intake?: IntakeName;
    course?: string;
    page?: string;
  }>;
};

const statuses: StudentStatus[] = ["new", "applied", "offer", "visa", "enrolled"];
const intakes: IntakeName[] = ["Jan", "May", "Sep"];
const pageSize = 15;

export default async function DashboardPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const page = Math.max(1, Number(filters.page ?? 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("students").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (filters.q) query = query.or(`name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.intake) query = query.eq("intake", filters.intake);
  if (filters.course) query = query.ilike("preferred_course", `%${filters.course}%`);

  const [{ data: students = [], count }, total, active, courses] = await Promise.all([
    query.range(from, to),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }).in("status", ["new", "applied"]),
    supabase.from("courses").select("field").order("field"),
  ]);

  const uniqueFields = Array.from(new Set(((courses.data ?? []) as Pick<Course, "field">[]).map((course) => course.field))).filter(Boolean);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total Students</p>
          <p className="mt-3 text-3xl font-semibold">{total.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Active Applications</p>
          <p className="mt-3 text-3xl font-semibold">{active.count ?? 0}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <form className="grid gap-4 border-b border-zinc-200 p-5 md:grid-cols-[1fr_180px_180px_180px_auto]">
          <Field label="Search"><Input name="q" defaultValue={filters.q} placeholder="Name or email" /></Field>
          <Field label="Status">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </Select>
          </Field>
          <Field label="Intake">
            <Select name="intake" defaultValue={filters.intake ?? ""}>
              <option value="">All</option>
              {intakes.map((intake) => <option key={intake}>{intake}</option>)}
            </Select>
          </Field>
          <Field label="Course">
            <Select name="course" defaultValue={filters.course ?? ""}>
              <option value="">All</option>
              {uniqueFields.map((field) => <option key={field}>{field}</option>)}
            </Select>
          </Field>
          <div className="flex items-end"><Button><Search size={16} />Filter</Button></div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Preferred Course</th>
                <th className="px-5 py-3 font-medium">IELTS</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(students as Student[]).map((student) => (
                <tr key={student.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/students/${student.id}`} className="font-medium text-black hover:underline">{student.name}</Link>
                    <p className="text-xs text-zinc-500">{student.email}</p>
                  </td>
                  <td className="px-5 py-4">{student.preferred_course}</td>
                  <td className="px-5 py-4">{student.ielts.toFixed(1)}</td>
                  <td className="px-5 py-4">{currencyGBP(student.budget)}</td>
                  <td className="px-5 py-4"><StatusBadge status={student.status} /></td>
                </tr>
              ))}
              {(students ?? []).length === 0 ? (
                <tr><td className="px-5 py-10 text-center text-zinc-500" colSpan={5}>No students match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4 text-sm text-zinc-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Link className="rounded-md border border-zinc-300 px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={page <= 1} href={`/dashboard?page=${page - 1}`}>Previous</Link>
            <Link className="rounded-md border border-zinc-300 px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={page >= totalPages} href={`/dashboard?page=${page + 1}`}>Next</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
