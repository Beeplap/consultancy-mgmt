import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
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

const englishGrades: EnglishGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
const intakes: IntakeName[] = ["Jan", "May", "Sep"];

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
    <div className="grid gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Match Student</h1>
        <p className="mt-1 text-sm text-zinc-600">Filter universities by GPA, English grade, IELTS waiver, IELTS score, budget, intake, and course.</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <form className="grid gap-4 border-b border-zinc-200 p-5 lg:grid-cols-[140px_150px_180px_140px_160px_140px_1fr_auto]">
          <Field label="GPA">
            <Input name="gpa" type="number" step="0.1" min="0" max="100" defaultValue={filters.gpa} placeholder="75" />
          </Field>
          <Field label="English Grade">
            <Select name="englishGrade" defaultValue={filters.englishGrade ?? ""}>
              <option value="">Select</option>
              {englishGrades.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-end gap-3 pb-2 text-sm font-medium text-zinc-800">
            <input name="waiver" type="checkbox" value="1" defaultChecked={criteria.applyWithWaiver} className="size-4 accent-black" />
            Apply with waiver
          </label>
          <Field label="IELTS">
            <Input name="ielts" type="number" step="0.1" min="0" max="9" defaultValue={filters.ielts} placeholder="6.0" />
          </Field>
          <Field label="Budget">
            <Input name="budget" type="number" min="0" defaultValue={filters.budget} placeholder="12000" />
          </Field>
          <Field label="Intake">
            <Select name="intake" defaultValue={filters.intake ?? ""}>
              <option value="">Any</option>
              {intakes.map((intake) => (
                <option key={intake}>{intake}</option>
              ))}
            </Select>
          </Field>
          <Field label="Course">
            <Input name="course" defaultValue={filters.course} placeholder="IT, Business, Health" />
          </Field>
          <div className="flex items-end">
            <Button>
              <Filter size={16} />
              Match
            </Button>
          </div>
        </form>

        <div className="border-b border-zinc-200 px-5 py-3 text-sm text-zinc-600">
          {criteria.applyWithWaiver ? waiverCopy(waiverStatus) : "Waiver off: universities are filtered by minimum GPA and IELTS requirements."}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">University</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Requirements</th>
                <th className="px-5 py-3 font-medium">Waiver</th>
                <th className="px-5 py-3 font-medium">Tuition</th>
                <th className="px-5 py-3 font-medium">Intake</th>
                <th className="px-5 py-3 font-medium">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recommendations.map((recommendation) => (
                <tr key={`${recommendation.course.id}-${recommendation.intake.id}`} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{recommendation.course.universities?.name}</p>
                    <p className="text-xs text-zinc-500">{recommendation.course.universities?.location}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p>{recommendation.course.name}</p>
                    <p className="text-xs text-zinc-500">{recommendation.course.degree} · {recommendation.course.duration} · {recommendation.course.field}</p>
                  </td>
                  <td className="px-5 py-4">
                    GPA {recommendation.course.min_gpa}
                    <br />
                    IELTS {recommendation.course.min_ielts}
                  </td>
                  <td className="px-5 py-4">{formatWaiver(recommendation.course.ielts_waiver)}</td>
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
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
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
