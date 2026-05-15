import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { universityCoverPublicUrl } from "@/lib/university-cover";
import type { UniversityPhoto } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type CourseDetailsRow = {
  description: string | null;
  universities: {
    description: string | null;
    photo_path: string | null;
    university_photos?: Array<Pick<UniversityPhoto, "photo_path">>;
  } | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("courses")
    .select("description, universities(description, photo_path, university_photos(photo_path))")
    .eq("id", courseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") notFound();
    return Response.json({ error: error.message }, { status: 500 });
  }

  const row = data as CourseDetailsRow;
  const university = row.universities;
  const galleryUrls = [
    ...(university?.university_photos ?? []).map((photo) =>
      universityCoverPublicUrl(photo.photo_path, { width: 896, quality: 75 }),
    ),
    universityCoverPublicUrl(university?.photo_path ?? null, { width: 896, quality: 75 }),
  ].filter((url): url is string => Boolean(url));

  return Response.json({
    courseDescription: row.description,
    universityDescription: university?.description ?? null,
    universityPhotoUrls: [...new Set(galleryUrls)],
  });
}
