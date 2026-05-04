import { MatchCourseRows, type MatchCourseRowSerialized } from "@/components/match-course-rows";
import { MatchFiltersForm } from "@/components/match-filters-form";
import { currencyGBP } from "@/lib/format";
import { universityCoverPublicUrl } from "@/lib/university-cover";
import { getIeltsWaiverStatus, rankCourses, type MatchingCriteria, type Recommendation } from "@/lib/matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseWithUniversity, EnglishGrade, Intake, IntakeName } from "@/lib/database.types";

type PageProps = {
  searchParams: Promise<{
    _match?: string;
    gpa?: string;
    englishGrade?: EnglishGrade;
    waiver?: string;
    ielts?: string;
    budget?: string;
    intake?: IntakeName;
    course?: string;
  }>;
};

const intakeRank: Record<IntakeName, number> = { Jan: 0, May: 1, Sep: 2 };

/** One row per course; all intakes in one cell. */
type CourseTableRow = {
  course: CourseWithUniversity;
  intakeEntries: Array<{ intake: Intake; score?: number | null }>;
  matchScore: number | null;
};

export default async function CourseRecommendationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const ranMatch = filters._match === "1";
  const criteria = toCriteria(filters);
  const supabase = await createSupabaseServerClient();

  const { count: universityDirectoryCount } = await supabase.from("universities").select("*", { count: "exact", head: true });

  let query = supabase
    .from("courses")
    .select("*, universities(*), intakes!inner(*)")
    .neq("intakes.status", "closed")
    .order("fee", { ascending: true, nullsFirst: false });

  if (ranMatch) {
    if (criteria.gpa !== undefined) query = query.or(`min_gpa.is.null,min_gpa.lte.${criteria.gpa}`);
    if (criteria.budget !== undefined) query = query.or(`fee.is.null,fee.lte.${criteria.budget}`);
    if (criteria.intake) query = query.eq("intakes.intake", criteria.intake);
    if (!criteria.applyWithWaiver && criteria.ielts !== undefined) {
      query = query.or(`min_ielts.is.null,min_ielts.lte.${criteria.ielts}`);
    }
    if (criteria.applyWithWaiver) query = query.neq("ielts_waiver", "none");
  }

  const { data: coursesRaw, error } = await query;
  if (error) throw new Error(error.message);

  let courses = mergeCourseRows((coursesRaw ?? []) as CourseWithUniversity[]);

  if (ranMatch) {
    courses = filterCoursePreference(courses, criteria.preferredCourse);
  }

  const rows: CourseTableRow[] = ranMatch
    ? groupRecommendations(rankCourses(criteria, courses))
    : catalogGroupedRows(courses);

  const serializedRows = rows.map((row) => serializeMatchCourseRow(row, ranMatch));

  const uniqueUniversities = new Set(rows.map((r) => r.course.university_id)).size;
  const directoryTotal = universityDirectoryCount ?? uniqueUniversities;

  const waiverStatus = criteria.applyWithWaiver ? getIeltsWaiverStatus(criteria) : "required";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Course Match</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Each course is one row. Intakes appear together before Match; filtered results keep the same layout.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <MatchFiltersForm filters={filters} />

        <div className="border-b border-zinc-200 px-4 py-2 text-sm text-zinc-600">
          {!ranMatch ? (
            <>
              Showing <span className="font-medium text-zinc-800">{rows.length}</span> courses across{" "}
              <span className="font-medium text-zinc-800">{uniqueUniversities}</span> universities
              {directoryTotal > 0 ? (
                <>
                  {" "}
                  (<span className="font-medium text-zinc-800">{directoryTotal}</span> in directory)
                </>
              ) : null}
              . Click <span className="font-medium text-zinc-800">Match</span> to filter.
            </>
          ) : criteria.applyWithWaiver ? (
            <>
              {waiverCopy(waiverStatus)} <span className="font-medium text-zinc-800">{rows.length}</span> matching courses ·{" "}
              <span className="font-medium text-zinc-800">{uniqueUniversities}</span> universities.
            </>
          ) : (
            <>
              Waiver off: IELTS filters apply when set. <span className="font-medium text-zinc-800">{rows.length}</span> matching courses ·{" "}
              <span className="font-medium text-zinc-800">{uniqueUniversities}</span> universities.
            </>
          )}
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="w-10 px-2 py-2 font-medium" aria-label="Details" />
                <th className="px-4 py-2 font-medium">University</th>
                <th className="px-4 py-2 font-medium">Course</th>
                <th className="px-4 py-2 font-medium">Req.</th>
                <th className="px-4 py-2 font-medium">Waiver</th>
                <th className="px-4 py-2 font-medium">Fee</th>
                <th className="min-w-[200px] px-4 py-2 font-medium">Intakes</th>
                <th className="px-4 py-2 font-medium">Match</th>
              </tr>
            </thead>
            <MatchCourseRows
              rows={serializedRows}
              emptyMessage={ranMatch ? "No courses match the current filters." : "No courses with open intakes yet."}
            />
          </table>
        </div>
      </section>
    </div>
  );
}

function mergeCourseRows(rows: CourseWithUniversity[]): CourseWithUniversity[] {
  const byId = new Map<string, CourseWithUniversity>();
  for (const row of rows) {
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, { ...row, intakes: [...row.intakes] });
      continue;
    }
    const seen = new Set(prev.intakes.map((i) => i.id));
    for (const i of row.intakes) {
      if (!seen.has(i.id)) {
        prev.intakes.push(i);
        seen.add(i.id);
      }
    }
    if (prev.universities && row.universities) {
      prev.universities = {
        ...prev.universities,
        description: prev.universities.description ?? row.universities.description,
        photo_path: prev.universities.photo_path ?? row.universities.photo_path,
      };
    }
  }
  return [...byId.values()];
}

function sortIntakes(entries: Array<{ intake: Intake }>) {
  return [...entries].sort((a, b) => intakeRank[a.intake.intake as IntakeName] - intakeRank[b.intake.intake as IntakeName]);
}

function catalogGroupedRows(courses: CourseWithUniversity[]): CourseTableRow[] {
  const sorted = [...courses].sort((a, b) => sortCourses(a, b));
  return sorted.map((course) => {
    const open = course.intakes.filter((i) => i.status !== "closed");
    const intakeEntries = sortIntakes(open.map((intake) => ({ intake, score: null as number | null })));
    return { course, intakeEntries, matchScore: null };
  });
}

function groupRecommendations(recommendations: Recommendation[]): CourseTableRow[] {
  const byCourseId = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const list = byCourseId.get(rec.course.id) ?? [];
    list.push(rec);
    byCourseId.set(rec.course.id, list);
  }

  const rows: CourseTableRow[] = [];
  for (const group of byCourseId.values()) {
    const course = group[0].course;
    const intakeEntries = sortIntakes(
      group.map((rec) => ({ intake: rec.intake, score: rec.score as number | null })),
    );
    const scores = group.map((r) => r.score);
    const matchScore = Math.max(...scores);
    rows.push({ course, intakeEntries, matchScore });
  }

  return rows.sort((a, b) => sortCourses(a.course, b.course));
}

function sortCourses(a: CourseWithUniversity, b: CourseWithUniversity) {
  const ua = (a.universities?.name ?? "").localeCompare(b.universities?.name ?? "");
  if (ua !== 0) return ua;
  return (a.name ?? "").localeCompare(b.name ?? "");
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
  return courses.filter((course) =>
    `${course.name ?? ""} ${course.field ?? ""} ${course.degree ?? ""}`.toLowerCase().includes(query),
  );
}

function formatWaiver(value: CourseWithUniversity["ielts_waiver"]) {
  if (value === "b_or_above") return "B or above";
  if (value === "c_plus_limited") return "C+ limited";
  if (value === "none") return "No waiver";
  return "—";
}

function formatCasLine(course: Pick<CourseWithUniversity, "cas_deposit" | "cas_deposit_amount">) {
  if (course.cas_deposit !== "required") return "Not required";
  if (course.cas_deposit_amount != null) return `Required (${currencyGBP(course.cas_deposit_amount)})`;
  return "Required";
}

function serializeMatchCourseRow(row: CourseTableRow, ranMatch: boolean): MatchCourseRowSerialized {
  const c = row.course;
  const scholarship =
    c.scholarship_upto != null ? `Up to ${currencyGBP(c.scholarship_upto)}` : "—";
  return {
    courseId: c.id,
    universityName: c.universities?.name ?? null,
    universityLocation: c.universities?.location ?? null,
    universityDescription: c.universities?.description ?? null,
    universityCoverUrl: universityCoverPublicUrl(c.universities?.photo_path ?? null),
    courseName: c.name ?? null,
    subtitle: [c.degree, c.duration, c.field].filter(Boolean).join(" · ") || "—",
    courseDescription: c.description ?? null,
    minGpa: c.min_gpa,
    minIelts: c.min_ielts,
    waiver: formatWaiver(c.ielts_waiver),
    fee: currencyGBP(c.fee),
    gap: c.accepted_gap?.trim() || "—",
    cas: formatCasLine(c),
    scholarship,
    intakeEntries: row.intakeEntries.map(({ intake, score }) => ({
      id: intake.id,
      intake: intake.intake,
      status: intake.status,
      score: ranMatch ? (score ?? null) : null,
    })),
    matchScore: row.matchScore,
    ranMatch,
  };
}

function waiverCopy(status: ReturnType<typeof getIeltsWaiverStatus>) {
  if (status === "waived") return "Waiver on: English grade B or above can apply to universities that accept IELTS waiver.";
  if (status === "limited") return "Waiver on: English grade C+ only shows universities marked as C+ limited.";
  return "Waiver on: select English grade B or above, or C+ for limited universities.";
}
