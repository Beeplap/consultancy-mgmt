import Link from "next/link";
import { SuccessBanner } from "@/components/success-banner";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createUniversityAction } from "@/lib/actions/universities";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { requireRole } from "@/lib/auth";
import { universityCoverAcceptAttr } from "@/lib/university-cover";

export default async function UniversitiesAddPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  await requireRole("admin");
  const { success } = await searchParams;

  return (
    <div className="grid gap-7">
      {success === "university" && <SuccessBanner message="University added successfully!" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add university</h1>
          <p className="mt-1 text-sm text-zinc-600">Create universities here. Course uploads are handled from the separate CSV import page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={universitiesAdminRoutes.importCourses}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
          >
            Import courses CSV
          </Link>
          <Link
            href={universitiesAdminRoutes.manage}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50"
          >
            Open Universities Management
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Add university</h2>
        <p className="mb-4 text-sm text-zinc-600">Create an empty university record. Course imports are managed separately.</p>
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
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Save university
              </button>
            </div>
          </div>
          <Field label="Description (optional)">
            <Textarea name="description" placeholder="Shown in course matching when a course row is expanded." rows={4} />
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
    </div>
  );
}
