import Link from "next/link";
import { UniversityCourseSection } from "@/components/university-course-section";
import { UniversityCoursesTable } from "@/components/university-courses-table";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { requireRole } from "@/lib/auth";
import type { Course, Intake, University } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CourseRow = Course & { intakes: Intake[] };
type UniversityRow = University & { courses: CourseRow[] };

export default async function UniversitiesManagePage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: universities = [] } = await supabase
    .from("universities")
    .select("*, courses(*, intakes(*))")
    .order("name", { nullsFirst: false });

  const uniRows = universities as UniversityRow[];

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Universities Management</h1>
          <p className="mt-1 text-sm text-zinc-600">Edit universities, browse courses &amp; intakes, and delete records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={universitiesAdminRoutes.add}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
          >
            Add university
          </Link>
          <Link
            href={universitiesAdminRoutes.importCourses}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
          >
            Import courses CSV
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Courses &amp; intakes</h2>
          <p className="mt-1 text-xs text-zinc-600">Courses and intakes grouped by university.</p>
        </div>
        {uniRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            No universities yet.{" "}
            <Link href={universitiesAdminRoutes.add} className="font-medium text-zinc-800 underline underline-offset-2 hover:text-black">
              Add a university
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <div>
            {uniRows.map((university) => (
              <UniversityCourseSection
                key={university.id}
                university={{
                  id: university.id,
                  name: university.name,
                  location: university.location,
                  ranking: university.ranking,
                  description: university.description,
                  photo_path: university.photo_path,
                }}
              >
                <UniversityCoursesTable courses={university.courses} />
              </UniversityCourseSection>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
