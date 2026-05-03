import {
  COURSE_NAME_PRESETS,
  DEGREE_PRESETS,
  DURATION_PRESETS,
  STUDY_FIELD_PRESETS,
  mergeBuiltInPresets,
} from "@/lib/course-form-presets";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type CatalogPresetKindDb = "course_name" | "degree" | "duration" | "field";

export type MergedCatalogPresetOptions = {
  coursePresets: string[];
  degreePresets: string[];
  durationPresets: string[];
  fieldPresets: string[];
};

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const STATIC_BY_KIND: Record<CatalogPresetKindDb, readonly string[]> = {
  course_name: COURSE_NAME_PRESETS,
  degree: DEGREE_PRESETS,
  duration: DURATION_PRESETS,
  field: STUDY_FIELD_PRESETS,
};

export async function fetchMergedCatalogPresetLists(supabase: DbClient): Promise<MergedCatalogPresetOptions> {
  const buckets: Record<CatalogPresetKindDb, string[]> = {
    course_name: [],
    degree: [],
    duration: [],
    field: [],
  };

  const { data, error } = await supabase.from("custom_catalog_presets").select("kind, label").order("label");

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const kind = row.kind as CatalogPresetKindDb | undefined;
    if (!label || !kind || buckets[kind] === undefined) continue;
    buckets[kind].push(label);
  }

  return {
    coursePresets: mergeBuiltInPresets(COURSE_NAME_PRESETS, buckets.course_name),
    degreePresets: mergeBuiltInPresets(DEGREE_PRESETS, buckets.degree),
    durationPresets: mergeBuiltInPresets(DURATION_PRESETS, buckets.duration),
    fieldPresets: mergeBuiltInPresets(STUDY_FIELD_PRESETS, buckets.field),
  };
}

async function insertIfCustom(supabase: DbClient, kind: CatalogPresetKindDb, raw: string | null | undefined) {
  const label = typeof raw === "string" ? raw.trim() : "";
  if (!label) return;
  if (STATIC_BY_KIND[kind].some((x) => x.trim().toLowerCase() === label.toLowerCase())) return;

  const { error } = await supabase.from("custom_catalog_presets").insert({
    kind,
    label,
  });

  if (!error) return;
  const code = (error as { code?: string }).code ?? "";
  if (code !== "23505") throw new Error(error.message);
}

/** Store labels that aren’t duplicates of built-in presets so they appear in pick lists later. */
export async function persistCourseCatalogSuggestions(
  supabase: DbClient,
  payload: {
    courseName?: string | null;
    degree?: string | null;
    duration?: string | null;
    field?: string | null;
  },
) {
  await insertIfCustom(supabase, "course_name", payload.courseName);
  await insertIfCustom(supabase, "degree", payload.degree);
  await insertIfCustom(supabase, "duration", payload.duration);
  await insertIfCustom(supabase, "field", payload.field);
}
