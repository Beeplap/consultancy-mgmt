import Link from "next/link";
import { deleteCourseAction } from "@/lib/actions/universities";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { Course } from "@/lib/database.types";

export function CourseRowActions({ course }: { course: Course }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/admin/universities/courses/${course.id}/edit`}
        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-black transition hover:bg-zinc-50"
      >
        Edit
      </Link>
      <form action={deleteCourseAction} className="inline">
        <input type="hidden" name="courseId" value={course.id} />
        <ConfirmSubmitButton message={`Delete ${course.name ?? "this course"}?`} className="h-9 px-3">
          Delete
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
