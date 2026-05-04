import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [universityCount, courseCount, intakeCount] = await Promise.all([
    supabase.from("universities").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("intakes").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">University and course directory overview.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total Universities</p>
          <p className="mt-3 text-3xl font-semibold">{universityCount.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total Courses</p>
          <p className="mt-3 text-3xl font-semibold">{courseCount.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Open/Tracked Intakes</p>
          <p className="mt-3 text-3xl font-semibold">{intakeCount.count ?? 0}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="grid gap-3 p-5 text-sm">
          <p className="text-zinc-700">Student module has been removed from this workspace.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/universities/manage"
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Manage universities
            </Link>
            <Link
              href="/dashboard/admin/universities/add"
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Add university & course
            </Link>
            <Link
              href="/dashboard/course-recommendations"
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Open match page
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
