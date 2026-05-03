import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { currencyGBP } from "@/lib/format";
import { fetchCandidateCourses, recommendCourses } from "@/lib/matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/database.types";

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CourseRecommendationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("students").select("*").order("created_at", { ascending: false }).limit(20);
  if (filters.q) query = query.or(`name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,preferred_course.ilike.%${filters.q}%`);

  const { data: students = [], error } = await query;
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (students as Student[]).map(async (student) => {
      const courses = await fetchCandidateCourses(supabase, student);
      const recommendations = recommendCourses(student, courses);

      return {
        student,
        recommendations,
        bestMatch: recommendations[0],
      };
    }),
  );

  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Match Student</h1>
        <p className="mt-1 text-sm text-zinc-600">Choose a student and open their ranked course recommendations.</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <form className="grid gap-4 border-b border-zinc-200 p-5 md:grid-cols-[1fr_auto]">
          <Field label="Search student">
            <Input name="q" defaultValue={filters.q} placeholder="Name, email, or course" />
          </Field>
          <div className="flex items-end">
            <Button>
              <Search size={16} />
              Search
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Preferred Course</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Best Match</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(({ student, recommendations, bestMatch }) => (
                <tr key={student.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-zinc-500">{student.email}</p>
                  </td>
                  <td className="px-5 py-4">{student.preferred_course}</td>
                  <td className="px-5 py-4">{currencyGBP(student.budget)}</td>
                  <td className="px-5 py-4">
                    {bestMatch ? (
                      <>
                        <p className="font-medium">{bestMatch.course.name}</p>
                        <p className="text-xs text-zinc-500">{bestMatch.course.universities?.name}</p>
                      </>
                    ) : (
                      <span className="text-zinc-500">No eligible match</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {bestMatch ? <span className="font-semibold text-green-700">{bestMatch.score}%</span> : <span className="text-zinc-500">-</span>}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50"
                    >
                      View matches
                      <ArrowRight size={15} />
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{recommendations.length} ranked</p>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-zinc-500" colSpan={7}>
                    No students found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
