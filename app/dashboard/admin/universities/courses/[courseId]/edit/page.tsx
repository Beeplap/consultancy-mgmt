import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CourseEditForm } from "@/components/course-edit-form";
import { requireRole } from "@/lib/auth";
import type { Course, Intake } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function EditCoursePage({ params }: PageProps) {
  await requireRole("admin");
  const { courseId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: course, error } = await supabase.from("courses").select("*, intakes(*)").eq("id", courseId).single();

  if (error || !course) notFound();

  const { data: uniRows } = await supabase.from("universities").select("id, name").order("name", { nullsFirst: false });
  const universities = uniRows ?? [];

  const typedCourse = course as Course & { intakes: Intake[] };

  return (
    <div className="mx-auto grid max-w-5xl gap-7 pb-12">
      <div>
        <Link
          href="/dashboard/admin/universities"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to universities
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Edit course</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Update course details and intakes. This screen mirrors &quot;Add course to a university&quot;.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <CourseEditForm course={typedCourse} universities={universities} />
      </section>
    </div>
  );
}
