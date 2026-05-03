import { randomUUID } from "node:crypto";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const UNIVERSITY_COVERS_BUCKET = "university-covers";
export const UNIVERSITY_COVER_MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function universityCoverAcceptAttr() {
  return "image/jpeg,image/jpg,image/png,image/webp,image/gif";
}

export function universityCoverPublicUrl(path: string | null | undefined): string | null {
  const trimmed = typeof path === "string" ? path.trim() : "";
  if (!trimmed) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  if (!base) return null;
  const encodedPath = trimmed
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${UNIVERSITY_COVERS_BUCKET}/${encodedPath}`;
}

export function validateUniversityCoverMeta(file: File) {
  if (file.size > UNIVERSITY_COVER_MAX_BYTES) {
    throw new Error("University photo must be smaller than 2MB.");
  }
  if (!MIME_TO_EXT[file.type.toLowerCase()]) {
    throw new Error("Use a JPG, PNG, WebP, or GIF for the university photo.");
  }
}

/** Upload returning object path `{university_id}/{uuid}.ext`. */
export async function uploadUniversityCover(supabase: SupabaseServerClient, universityId: string, file: File): Promise<string> {
  validateUniversityCoverMeta(file);
  const ext = MIME_TO_EXT[file.type.toLowerCase()];
  const objectPath = `${universityId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(UNIVERSITY_COVERS_BUCKET).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return objectPath;
}

export async function removeUniversityCoverObject(supabase: SupabaseServerClient, photoPath: string | null | undefined) {
  const p = typeof photoPath === "string" ? photoPath.trim() : "";
  if (!p) return;
  const { error } = await supabase.storage.from(UNIVERSITY_COVERS_BUCKET).remove([p]);
  if (error) throw new Error(error.message);
}
