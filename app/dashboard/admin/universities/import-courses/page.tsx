import Link from "next/link";
import { CourseCsvImporter } from "@/components/course-csv-importer";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ImportCoursesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("universities").select("id, name").order("name", { nullsFirst: false });
  const universities = data ?? [];

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import courses by CSV</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Universities stay manual. Select an existing university, map CSV headers, then import all courses in bulk.
          </p>
        </div>
        <Link
          href={universitiesAdminRoutes.manage}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
        >
          Open Universities Management
        </Link>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <CourseCsvImporter universities={universities} />
      </section>
    </div>
  );
}
