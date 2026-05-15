import { MatchCourseRows, type MatchCourseRowSerialized } from "@/components/match-course-rows";
import { MatchFiltersForm } from "@/components/match-filters-form";
import { currencyGBP } from "@/lib/format";
import { getIeltsWaiverStatus, hasEnglishWaiver, rankCourses, type MatchingCriteria, type Recommendation } from "@/lib/matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseWithUniversity, EnglishGrade, Intake, IntakeName } from "@/lib/database.types";

type PageProps = {
  searchParams: Promise<{
    _match?: string;
    gpa?: string;
    englishGrade?: EnglishGrade;
    waiver?: string;
    ielts?: string;
    pte?: string;
    budget?: string;
    intake?: IntakeName;
    course?: string;
    universityId?: string;
    city?: string;
    sort?: string;
  }>;
};

const intakeRank: Record<string, number> = { Jan: 0, January: 0, May: 1, Sep: 2, Sept: 2, September: 2, Nov: 3, November: 3 };

/** One row per course; all intakes in one cell. */
type CourseTableRow = {
  course: CourseWithUniversity;
  intakeEntries: Array<{ intake: Intake; score?: number | null }>;
  matchScore: number | null;
};

const courseListSelect =
  "id, university_id, name, degree, duration, field, min_gpa, min_ielts, min_pte, ielts_waiver, fee, accepted_gap, cas_deposit, cas_deposit_amount, scholarship_upto, universities(id, name, location, ranking), intakes(id, course_id, intake, status)";

export default async function CourseRecommendationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const ranMatch = filters._match === "1";
  const criteria = toCriteria(filters);
  const supabase = await createSupabaseServerClient();

  const [{ count: universityDirectoryCount }, { data: universityListRaw }] = await Promise.all([
    supabase.from("universities").select("id", { count: "exact", head: true }),
    supabase.from("universities").select("id,name,location").order("name", { nullsFirst: false }),
  ]);
  const universityList = universityListRaw ?? [];
  const cityOptions = uniqueCities(universityList.map((university) => university.location));

  let query = supabase
    .from("courses")
    .select(courseListSelect)
    .order("fee", { ascending: true, nullsFirst: false });

  if (ranMatch) {
    if (criteria.budget !== undefined) query = query.or(`fee.is.null,fee.lte.${criteria.budget}`);
  }
  if (filters.universityId?.trim()) {
    query = query.eq("university_id", filters.universityId.trim());
  }

  const { data: coursesRaw, error } = await query;
  if (error) throw new Error(error.message);

  let courses = mergeCourseRows((coursesRaw ?? []) as CourseWithUniversity[]);

  if (criteria.applyWithWaiver) {
    courses = courses.filter((course) => hasEnglishWaiver(course.ielts_waiver));
  }
  courses = filterCoursesByCity(courses, filters.city);
  courses = filterCourseSearch(courses, criteria.preferredCourse);

  let rows: CourseTableRow[] = ranMatch
    ? groupRecommendationsWithUnmatched(rankCourses(criteria, courses), courses)
    : catalogGroupedRows(courses);
  rows = sortRows(rows, filters.sort ?? "relevance", ranMatch);

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
        <MatchFiltersForm filters={filters} universities={universityList} cities={cityOptions} />

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
              . Use filters to narrow large CSV imports quickly.
            </>
          ) : criteria.applyWithWaiver ? (
            <>
              {waiverCopy(waiverStatus)} <span className="font-medium text-zinc-800">{rows.length}</span> matching courses ·{" "}
              <span className="font-medium text-zinc-800">{uniqueUniversities}</span> universities.
            </>
          ) : (
            <>
              Waiver off: IELTS/PTE filters apply when set. <span className="font-medium text-zinc-800">{rows.length}</span> matching courses ·{" "}
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
      };
    }
  }
  return [...byId.values()];
}

function sortIntakes(entries: Array<{ intake: Intake }>) {
  return [...entries].sort((a, b) => {
    const rankA = intakeRank[a.intake.intake] ?? Number.POSITIVE_INFINITY;
    const rankB = intakeRank[b.intake.intake] ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    return a.intake.intake.localeCompare(b.intake.intake);
  });
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

function groupRecommendationsWithUnmatched(
  recommendations: Recommendation[],
  allCourses: CourseWithUniversity[],
): CourseTableRow[] {
  const recommendedRows = groupRecommendations(recommendations);
  const recommendedCourseIds = new Set(recommendedRows.map((row) => row.course.id));
  const unmatchedRows = catalogGroupedRows(allCourses.filter((course) => !recommendedCourseIds.has(course.id)));
  return [...recommendedRows, ...unmatchedRows];
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
    pte: toNumber(filters.pte),
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

function filterCourseSearch(courses: CourseWithUniversity[], rawQuery?: string) {
  const text = rawQuery?.trim().toLowerCase();
  if (!text) return courses;
  const terms = text.split(/\s+/).filter(Boolean);

  return courses.filter((course) => {
    const haystack = [
      course.name,
      course.field,
      course.degree,
      course.duration,
      course.description,
      course.universities?.name,
      course.universities?.location,
      course.universities?.description,
      course.accepted_gap,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function uniqueCities(locations: Array<string | null>) {
  const byNormalized = new Map<string, string>();
  for (const location of locations) {
    const city = location?.trim();
    if (!city) continue;
    const normalized = normalizeCity(city);
    if (!byNormalized.has(normalized)) byNormalized.set(normalized, city);
  }
  return [...byNormalized.values()].sort((a, b) => a.localeCompare(b));
}

function filterCoursesByCity(courses: CourseWithUniversity[], city?: string) {
  const selectedCity = city?.trim();
  if (!selectedCity) return courses;
  const normalizedSelectedCity = normalizeCity(selectedCity);
  return courses.filter((course) => normalizeCity(course.universities?.location ?? "") === normalizedSelectedCity);
}

function normalizeCity(value: string) {
  return value.trim().toLowerCase();
}

function sortRows(rows: CourseTableRow[], sort: string, ranMatch: boolean) {
  const items = [...rows];
  if (sort === "university_az") {
    return items.sort((a, b) => sortCourses(a.course, b.course));
  }
  if (sort === "fee_low_high") {
    return items.sort((a, b) => (a.course.fee ?? Number.POSITIVE_INFINITY) - (b.course.fee ?? Number.POSITIVE_INFINITY));
  }
  if (sort === "fee_high_low") {
    return items.sort((a, b) => (b.course.fee ?? -1) - (a.course.fee ?? -1));
  }
  if (sort === "match_high_low" && ranMatch) {
    return items.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
  }
  if (ranMatch) {
    return items.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1) || sortCourses(a.course, b.course));
  }
  return items.sort((a, b) => sortCourses(a.course, b.course));
}

function formatWaiver(value: CourseWithUniversity["ielts_waiver"]) {
  if (value === "b_or_above") return "B or above";
  if (value === "c_plus_limited") return "C+ limited";
  if (value === "none") return "No waiver";
  return value?.trim() || "—";
}

function formatCasLine(course: Pick<CourseWithUniversity, "cas_deposit" | "cas_deposit_amount">) {
  if (course.cas_deposit !== "required") return "Not required";
  if (course.cas_deposit_amount != null) return `Required (${currencyGBP(course.cas_deposit_amount)})`;
  return "Required";
}

function serializeMatchCourseRow(row: CourseTableRow, ranMatch: boolean): MatchCourseRowSerialized {
  const c = row.course;
  const university = c.universities;
  const scholarship =
    c.scholarship_upto != null ? `Up to ${currencyGBP(c.scholarship_upto)}` : "—";
  return {
    courseId: c.id,
    universityName: university?.name ?? null,
    universityLocation: university?.location ?? null,
    courseName: c.name ?? null,
    subtitle: [c.degree, c.duration, c.field].filter(Boolean).join(" · ") || "—",
    minGpa: c.min_gpa,
    minIelts: c.min_ielts,
    minPte: c.min_pte,
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
  if (status === "waived") return "Waiver on: showing courses marked with any waiver option.";
  if (status === "limited") return "Waiver on: showing courses marked with any waiver option.";
  return "Waiver on: showing courses marked with any waiver option.";
}
