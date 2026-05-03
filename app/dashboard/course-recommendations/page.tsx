import { MatchFiltersForm } from "@/components/match-filters-form";
import { IntakeBadge } from "@/components/ui/badge";
import { currencyGBP } from "@/lib/format";
import { getIeltsWaiverStatus, rankCourses, type MatchingCriteria } from "@/lib/matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseWithUniversity, EnglishGrade, IntakeName } from "@/lib/database.types";

type PageProps = {
  searchParams: Promise<{
    gpa?: string;
    englishGrade?: EnglishGrade;
    waiver?: string;
    ielts?: string;
    budget?: string;
    intake?: IntakeName;
    course?: string;
  }>;
};

export default async function CourseRecommendationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const criteria = toCriteria(filters);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("courses")
    .select("*, universities(*), intakes!inner(*)")
    .neq("intakes.status", "closed")
    .order("tuition_fee", { ascending: true });

  if (criteria.gpa !== undefined) query = query.lte("min_gpa", criteria.gpa);
  if (criteria.budget !== undefined) query = query.lte("tuition_fee", criteria.budget);
  if (criteria.intake) query = query.eq("intakes.intake", criteria.intake);
  if (!criteria.applyWithWaiver && criteria.ielts !== undefined) query = query.lte("min_ielts", criteria.ielts);
  if (criteria.applyWithWaiver) query = query.neq("ielts_waiver", "none");

  const { data: courses = [], error } = await query;
  if (error) throw new Error(error.message);

  const recommendations = rankCourses(criteria, filterCoursePreference(courses as CourseWithUniversity[], criteria.preferredCourse));
  const waiverStatus = criteria.applyWithWaiver ? getIeltsWaiverStatus(criteria) : "required";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Match Student</h1>
        <p className="mt-1 text-sm text-zinc-600">Filter universities by GPA, English grade, IELTS, budget, intake, and course.</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <MatchFiltersForm filters={filters} />

        <div className="border-b border-zinc-200 px-4 py-2 text-sm text-zinc-600">
          {criteria.applyWithWaiver ? waiverCopy(waiverStatus) : "Waiver off: add IELTS to filter by minimum IELTS requirements."}
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">University</th>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Req.</th>
                <th className="px-4 py-2 font-medium">Waiver</th>
                <th className="px-4 py-2 font-medium">Tuition</th>
                <th className="px-4 py-2 font-medium">Intake</th>
                <th className="px-4 py-2 font-medium">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recommendations.map((recommendation) => (
                <tr key={`${recommendation.course.id}-${recommendation.intake.id}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{recommendation.course.universities?.name}</p>
                    <p className="text-xs text-zinc-500">{recommendation.course.universities?.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{recommendation.course.name}</p>
                    <p className="text-xs text-zinc-500">{recommendation.course.degree} · {recommendation.course.duration} · {recommendation.course.field}</p>
                  </td>
                  <td className="px-4 py-3">
                    GPA {recommendation.course.min_gpa}
                    <br />
                    IELTS {recommendation.course.min_ielts}
                  </td>
                  <td className="px-4 py-3">{formatWaiver(recommendation.course.ielts_waiver)}</td>
                  <td className="px-4 py-3">{currencyGBP(recommendation.course.tuition_fee)}</td>
                  <td className="px-4 py-3">
                    <p className="mb-1 font-medium">{recommendation.intake.intake}</p>
                    <IntakeBadge status={recommendation.intake.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={recommendation.score >= 80 ? "font-semibold text-green-700" : "font-semibold text-zinc-900"}>{recommendation.score}%</span>
                  </td>
                </tr>
              ))}
              {recommendations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No universities match the current filters.
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

function toCriteria(filters: Awaited<PageProps["searchParams"]>): MatchingCriteria {
  return {
    gpa: toNumber(filters.gpa),
    englishGrade: filters.englishGrade || null,
    applyWithWaiver: filters.waiver === "1",
    ielts: toNumber(filters.ielts),
    budget: toNumber(filters.budget),
    intake: filters.intake ?? "",
    preferredCourse: filters.course?.trim(),
  };
}

function toNumber(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterCoursePreference(courses: CourseWithUniversity[], preference?: string) {
  if (!preference) return courses;

  const query = preference.toLowerCase();
  return courses.filter((course) => `${course.name} ${course.field} ${course.degree}`.toLowerCase().includes(query));
}

function formatWaiver(value: CourseWithUniversity["ielts_waiver"]) {
  if (value === "b_or_above") return "B or above";
  if (value === "c_plus_limited") return "C+ limited";

  return "No waiver";
}

function waiverCopy(status: ReturnType<typeof getIeltsWaiverStatus>) {
  if (status === "waived") return "Waiver on: English grade B or above can apply to universities that accept IELTS waiver.";
  if (status === "limited") return "Waiver on: English grade C+ only shows universities marked as C+ limited.";

  return "Waiver on: select English grade B or above, or C+ for limited universities.";
}
