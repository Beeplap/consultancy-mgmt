import Link from "next/link";
import { SuccessBanner } from "@/components/success-banner";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { UniversityCourseForm } from "@/components/university-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createUniversityAction } from "@/lib/actions/universities";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { fetchMergedCatalogPresetLists } from "@/lib/catalog-custom-presets";
import { requireRole } from "@/lib/auth";
import { universityCoverAcceptAttr } from "@/lib/university-cover";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UniversitiesAddPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  await requireRole("admin");
  const { success } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("universities").select("id, name").order("name", { nullsFirst: false });
  const uniList = (data ?? []).map((u) => ({ id: u.id, name: u.name }));
  const mergedPresets = await fetchMergedCatalogPresetLists(supabase);

  return (
    <div className="grid gap-7">
      {success === "university" && <SuccessBanner message="University added successfully!" />}
      {success === "course" && <SuccessBanner message="Course added successfully!" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add university &amp; course</h1>
          <p className="mt-1 text-sm text-zinc-600">Create universities and attach courses—nothing is deleted here. Use Universities Management for the full catalogue.</p>
        </div>
        <Link
          href={universitiesAdminRoutes.manage}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
        >
          Open Universities Management
        </Link>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Add university</h2>
        <p className="mb-4 text-sm text-zinc-600">Create an empty university record, or add one while creating a course in the section below.</p>
        <form action={createUniversityAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            <Field label="Name">
              <Input name="name" />
            </Field>
            <Field label="UK city">
              <Input name="location" />
            </Field>
            <Field label="Ranking">
              <Input name="ranking" />
            </Field>
            <div className="flex justify-end md:justify-start">
              <PendingSubmitButton type="submit" variant="secondary" className="h-10" pendingChildren="Saving...">
                Save university
              </PendingSubmitButton>
            </div>
          </div>
          <Field label="Description (optional)">
            <Textarea name="description" placeholder="Shown on Match Student when a course is expanded. Line breaks are kept." rows={4} />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-zinc-800">University photo (optional)</span>
            <p className="text-xs text-zinc-500">
              Same photo for every course from this university on Match Student. JPG, PNG, WebP, or GIF · under 2MB · Supabase bucket{" "}
              <code className="rounded bg-zinc-100 px-1 py-px text-[11px]">university-covers</code>.
            </p>
            <input
              name="universityCover"
              type="file"
              accept={universityCoverAcceptAttr()}
              className="max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 focus:border-black focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold">Add course to a university</h2>
        <p className="mb-5 text-xs text-zinc-500">
          Course, degree, duration, and subject choices include built-in presets. Anything you submit that is typed manually (outside the preset list)
          is stored and appears in pick lists next time—for everyone using this CRM.
        </p>
        <UniversityCourseForm universities={uniList} mergedPresets={mergedPresets} />
      </section>
    </div>
  );
}
