import Link from "next/link";
import { currencyGBP, titleCase } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Course, Intake, University } from "@/lib/database.types";

type CountRow = {
  label: string;
  count: number;
  tone?: "green" | "amber" | "red" | "blue" | "zinc";
};

type TopUniversityRow = {
  id: string;
  name: string;
  location: string;
  ranking: number | null;
  count: number;
};

const feeBands = [
  { label: "Under GBP10k", min: 0, max: 10_000 },
  { label: "GBP10k-15k", min: 10_000, max: 15_000 },
  { label: "GBP15k-20k", min: 15_000, max: 20_000 },
  { label: "GBP20k-25k", min: 20_000, max: 25_000 },
  { label: "GBP25k+", min: 25_000, max: Number.POSITIVE_INFINITY },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [universitiesResult, coursesResult, intakesResult] = await Promise.all([
    supabase.from("universities").select("id,name,location,ranking").order("ranking", { ascending: true, nullsFirst: false }),
    supabase.from("courses").select("id,university_id,fee,ielts_waiver"),
    supabase.from("intakes").select("id,course_id,intake,status"),
  ]);

  if (universitiesResult.error) throw new Error(universitiesResult.error.message);
  if (coursesResult.error) throw new Error(coursesResult.error.message);
  if (intakesResult.error) throw new Error(intakesResult.error.message);

  const universities = (universitiesResult.data ?? []) as Array<Pick<University, "id" | "name" | "location" | "ranking">>;
  const courses = (coursesResult.data ?? []) as Array<Pick<Course, "id" | "university_id" | "fee" | "ielts_waiver">>;
  const intakes = (intakesResult.data ?? []) as Array<Pick<Intake, "id" | "course_id" | "intake" | "status">>;

  const activeIntakes = intakes.filter((item) => item.status !== "closed").length;
  const rankedUniversities = universities.filter((item) => item.ranking != null).length;
  const fees = courses.map((course) => course.fee).filter((fee): fee is number => typeof fee === "number");
  const averageFee = fees.length ? Math.round(fees.reduce((sum, fee) => sum + fee, 0) / fees.length) : null;
  const openRate = intakes.length ? Math.round((activeIntakes / intakes.length) * 100) : 0;

  const cityRows = topCounts(
    universities.map((university) => cleanLabel(university.location, "Unknown city")),
    6,
  );
  const feeRows = buildFeeBandRows(courses);
  const intakeStatusRows: CountRow[] = countValues(intakes.map((intake) => intake.status)).map((row) => ({
    ...row,
    label: titleCase(row.label),
    tone: row.label === "open" ? "green" : row.label === "closing" ? "amber" : "zinc",
  }));
  const intakeTermRows = topCounts(
    intakes.filter((intake) => intake.status !== "closed").map((intake) => cleanLabel(intake.intake, "Unspecified")),
    6,
  );
  const waiverRows = topCounts(courses.map((course) => formatWaiverBucket(course.ielts_waiver)), 5);
  const topUniversities = buildTopUniversities(universities, courses, 8);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Course catalog health, pricing spread, intake coverage, and university mix.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashboardLink href="/dashboard/course-recommendations">Open match page</DashboardLink>
          <DashboardLink href="/dashboard/admin/universities/manage">Manage universities</DashboardLink>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Universities" value={universities.length} helper={`${rankedUniversities} with ranking data`} />
        <MetricCard label="Courses" value={courses.length} helper={`${topUniversities.length} universities represented in top list`} />
        <MetricCard label="Active intakes" value={activeIntakes} helper={`${openRate}% of tracked intakes active`} tone="green" />
        <MetricCard label="Average fee" value={averageFee != null ? currencyGBP(averageFee) : "-"} helper={`${fees.length} courses with fee data`} tone="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Panel title="Top Universities By Course Catalog" subtitle="Where the current recommendation depth is strongest.">
          <div className="grid gap-3">
            {topUniversities.map((row, index) => (
              <div key={row.id} className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {index + 1}. {row.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {row.location}
                      {row.ranking ? ` · rank ${row.ranking}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{row.count}</p>
                </div>
                <Bar value={row.count} max={topUniversities[0]?.count ?? 1} tone="blue" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Intake Health" subtitle="Open and closing intakes that are usable in matching.">
          <StackedBar rows={intakeStatusRows} />
          <div className="mt-5 grid gap-3">
            {intakeStatusRows.map((row) => (
              <LegendRow key={row.label} row={row} total={intakes.length} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Course Fee Bands" subtitle="Useful for budget-led counselling conversations.">
          <BarList rows={feeRows} />
        </Panel>

        <Panel title="Cities Covered" subtitle="University locations represented in the directory.">
          <BarList rows={cityRows} tone="green" />
        </Panel>

        <Panel title="Open Intakes By Term" subtitle="Fast read on term availability.">
          <BarList rows={intakeTermRows} tone="amber" />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="English Waiver Mix" subtitle="How often courses can support waiver-led applications.">
          <BarList rows={waiverRows} tone="red" />
        </Panel>

        <Panel title="Quick Actions" subtitle="Common admin paths.">
          <div className="grid gap-2">
            <DashboardLink href="/dashboard/admin/universities/add">Add university</DashboardLink>
            <DashboardLink href="/dashboard/admin/universities/import-courses">Import courses CSV</DashboardLink>
            <DashboardLink href="/dashboard/admin/universities/manage">Review catalog</DashboardLink>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function DashboardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: CountRow["tone"];
}) {
  return (
    <div className={`rounded-lg border bg-white p-5 ${toneBorderClass(tone)}`}>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function BarList({ rows, tone = "blue" }: { rows: CountRow[]; tone?: CountRow["tone"] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No data yet.</p>;

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="min-w-0 truncate font-medium">{row.label}</p>
            <p className="shrink-0 text-zinc-600">{row.count}</p>
          </div>
          <Bar value={row.count} max={max} tone={row.tone ?? tone} />
        </div>
      ))}
    </div>
  );
}

function StackedBar({ rows }: { rows: CountRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return <div className="h-4 rounded-full bg-zinc-100" />;

  return (
    <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100">
      {rows.map((row) => (
        <div
          key={row.label}
          className={toneBgClass(row.tone)}
          style={{ width: `${Math.max(3, (row.count / total) * 100)}%` }}
          title={`${row.label}: ${row.count}`}
        />
      ))}
    </div>
  );
}

function LegendRow({ row, total }: { row: CountRow; total: number }) {
  const percent = total ? Math.round((row.count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${toneBgClass(row.tone)}`} />
        <span className="truncate font-medium">{row.label}</span>
      </div>
      <span className="shrink-0 text-zinc-600">
        {row.count} · {percent}%
      </span>
    </div>
  );
}

function Bar({ value, max, tone }: { value: number; max: number; tone?: CountRow["tone"] }) {
  const width = max ? Math.max(3, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
      <div className={`h-full rounded-full ${toneBgClass(tone)}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function buildTopUniversities(
  universities: Array<Pick<University, "id" | "name" | "location" | "ranking">>,
  courses: Array<Pick<Course, "university_id">>,
  limit: number,
): TopUniversityRow[] {
  const counts = new Map<string, number>();
  for (const course of courses) counts.set(course.university_id, (counts.get(course.university_id) ?? 0) + 1);

  return universities
    .map((university) => ({
      id: university.id,
      name: cleanLabel(university.name, "Unnamed university"),
      location: cleanLabel(university.location, "Unknown city"),
      ranking: university.ranking,
      count: counts.get(university.id) ?? 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || (a.ranking ?? Number.POSITIVE_INFINITY) - (b.ranking ?? Number.POSITIVE_INFINITY))
    .slice(0, limit);
}

function buildFeeBandRows(courses: Array<Pick<Course, "fee">>): CountRow[] {
  const rows = feeBands.map((band) => ({
    label: band.label,
    count: courses.filter((course) => typeof course.fee === "number" && course.fee >= band.min && course.fee < band.max).length,
  }));
  const unknown = courses.filter((course) => typeof course.fee !== "number").length;
  return unknown ? [...rows, { label: "No fee data", count: unknown, tone: "zinc" as const }] : rows;
}

function topCounts(values: string[], limit: number): CountRow[] {
  const rows = countValues(values).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  if (rows.length <= limit) return rows;

  const visible = rows.slice(0, limit);
  const otherCount = rows.slice(limit).reduce((sum, row) => sum + row.count, 0);
  return [...visible, { label: "Other", count: otherCount, tone: "zinc" }];
}

function countValues(values: string[]): CountRow[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function cleanLabel(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text || fallback;
}

function formatWaiverBucket(value: string | null | undefined) {
  const text = cleanLabel(value, "none").toLowerCase();
  if (["none", "no", "no waiver", "n/a", "na", "-"].includes(text)) return "No waiver";
  if (text.includes("moi")) return "MOI accepted";
  if (text.includes("b")) return "Grade B waiver";
  if (text.includes("c+")) return "C+ limited";
  return titleCase(text);
}

function toneBgClass(tone: CountRow["tone"] = "blue") {
  const classes = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-rose-500",
    blue: "bg-sky-500",
    zinc: "bg-zinc-400",
  };
  return classes[tone];
}

function toneBorderClass(tone: CountRow["tone"] = "zinc") {
  const classes = {
    green: "border-emerald-200",
    amber: "border-amber-200",
    red: "border-rose-200",
    blue: "border-sky-200",
    zinc: "border-zinc-200",
  };
  return classes[tone];
}
