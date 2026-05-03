"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { persistCourseCatalogSuggestions } from "@/lib/catalog-custom-presets";
import type { CasDepositPolicy, IeltsWaiverPolicy, IntakeName, IntakeStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function revalidateUniversitiesAdmin() {
  revalidatePath(universitiesAdminRoutes.root);
  revalidatePath(universitiesAdminRoutes.add);
  revalidatePath(universitiesAdminRoutes.manage);
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalTrimmed(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function optionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Preserves line breaks and internal spacing; empty / whitespace-only clears to null. */
function optionalDescription(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === undefined) return null;
  const text = typeof raw === "string" ? raw : String(raw);
  if (!text.trim()) return null;
  return text;
}

const intakeNames: IntakeName[] = ["Jan", "May", "Sep"];

function selectedIntakes(formData: FormData): IntakeName[] {
  const selected: IntakeName[] = [];
  for (const name of intakeNames) {
    if (formData.get(`intake_${name}`) === "on") selected.push(name);
  }
  return selected;
}

async function syncCourseIntakes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  courseId: string,
  selected: IntakeName[],
  intakeStatus: IntakeStatus,
) {
  const { data: existingData, error: fetchError } = await supabase.from("intakes").select("id, intake").eq("course_id", courseId);

  if (fetchError) throw new Error(fetchError.message);

  const existingRows = existingData ?? [];
  const selectedSet = new Set(selected);

  for (const row of existingRows) {
    if (!selectedSet.has(row.intake as IntakeName)) {
      const { error } = await supabase.from("intakes").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }

  const { data: currentData, error: fetch2Error } = await supabase.from("intakes").select("id, intake").eq("course_id", courseId);

  if (fetch2Error) throw new Error(fetch2Error.message);

  const current = currentData ?? [];
  const byIntake = new Map(current.map((r) => [r.intake as IntakeName, r.id]));

  for (const name of selected) {
    const id = byIntake.get(name);
    if (id) {
      const { error } = await supabase.from("intakes").update({ status: intakeStatus }).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("intakes").insert({ course_id: courseId, intake: name, status: intakeStatus });
      if (error) throw new Error(error.message);
    }
  }
}

export async function createUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("universities").insert({
    name: optionalTrimmed(formData, "name"),
    location: optionalTrimmed(formData, "location"),
    ranking: optionalNumber(formData, "ranking"),
    description: optionalDescription(formData, "description"),
  });

  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function updateUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");
  const { error } = await supabase
    .from("universities")
    .update({
      name: optionalTrimmed(formData, "name"),
      location: optionalTrimmed(formData, "location"),
      ranking: optionalNumber(formData, "ranking"),
      description: optionalDescription(formData, "description"),
    })
    .eq("id", universityId);

  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function createUniversityCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const universityId = String(formData.get("university_id") ?? "").trim();
  let resolvedUniversityId = universityId;

  if (!resolvedUniversityId) {
    const { data, error } = await supabase
      .from("universities")
      .insert({
        name: optionalTrimmed(formData, "universityName"),
        location: optionalTrimmed(formData, "location"),
        ranking: optionalNumber(formData, "ranking"),
        description: optionalDescription(formData, "universityDescription"),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    resolvedUniversityId = data.id;
  }

  const waiverRaw = optionalTrimmed(formData, "ielts_waiver");
  const casRaw = optionalTrimmed(formData, "cas_deposit") as CasDepositPolicy | null;
  const casDepositRequired = casRaw === "required";
  const ieltsWaiver =
    waiverRaw && (waiverRaw === "none" || waiverRaw === "b_or_above" || waiverRaw === "c_plus_limited")
      ? (waiverRaw as IeltsWaiverPolicy)
      : null;

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      university_id: resolvedUniversityId,
      name: optionalTrimmed(formData, "courseName"),
      degree: optionalTrimmed(formData, "degree"),
      duration: optionalTrimmed(formData, "duration"),
      field: optionalTrimmed(formData, "field"),
      min_gpa: optionalNumber(formData, "min_gpa"),
      min_ielts: optionalNumber(formData, "min_ielts"),
      ielts_waiver: ieltsWaiver,
      fee: optionalNumber(formData, "fee"),
      accepted_gap: optionalTrimmed(formData, "accepted_gap"),
      cas_deposit: casDepositRequired ? "required" : "not_required",
      cas_deposit_amount: casDepositRequired ? optionalNumber(formData, "cas_deposit_amount") : null,
      scholarship_upto: optionalNumber(formData, "scholarship_upto"),
      description: optionalDescription(formData, "courseDescription"),
    })
    .select("id")
    .single();

  if (courseError) throw new Error(courseError.message);

  const intakes = selectedIntakes(formData);
  const intakeStatus = (optionalTrimmed(formData, "intake_status") ?? "open") as IntakeStatus;

  if (intakes.length > 0) {
    const { error: intakeError } = await supabase.from("intakes").insert(
      intakes.map((intake) => ({
        course_id: course.id,
        intake,
        status: intakeStatus,
      })),
    );

    if (intakeError) throw new Error(intakeError.message);
  }

  await persistCourseCatalogSuggestions(supabase, {
    courseName: optionalTrimmed(formData, "courseName"),
    degree: optionalTrimmed(formData, "degree"),
    duration: optionalTrimmed(formData, "duration"),
    field: optionalTrimmed(formData, "field"),
  });

  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function updateUniversityCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseId = required(formData, "courseId");
  const universityId = String(formData.get("university_id") ?? "").trim();
  if (!universityId) throw new Error("University is required");

  const waiverRaw = optionalTrimmed(formData, "ielts_waiver");
  const casRaw = optionalTrimmed(formData, "cas_deposit") as CasDepositPolicy | null;
  const casDepositRequired = casRaw === "required";
  const ieltsWaiver =
    waiverRaw && (waiverRaw === "none" || waiverRaw === "b_or_above" || waiverRaw === "c_plus_limited")
      ? (waiverRaw as IeltsWaiverPolicy)
      : null;

  const { error } = await supabase
    .from("courses")
    .update({
      university_id: universityId,
      name: optionalTrimmed(formData, "courseName"),
      degree: optionalTrimmed(formData, "degree"),
      duration: optionalTrimmed(formData, "duration"),
      field: optionalTrimmed(formData, "field"),
      min_gpa: optionalNumber(formData, "min_gpa"),
      min_ielts: optionalNumber(formData, "min_ielts"),
      ielts_waiver: ieltsWaiver,
      fee: optionalNumber(formData, "fee"),
      accepted_gap: optionalTrimmed(formData, "accepted_gap"),
      cas_deposit: casDepositRequired ? "required" : "not_required",
      cas_deposit_amount: casDepositRequired ? optionalNumber(formData, "cas_deposit_amount") : null,
      scholarship_upto: optionalNumber(formData, "scholarship_upto"),
      description: optionalDescription(formData, "courseDescription"),
    })
    .eq("id", courseId);

  if (error) throw new Error(error.message);

  const intakes = selectedIntakes(formData);
  const intakeStatus = (optionalTrimmed(formData, "intake_status") ?? "open") as IntakeStatus;
  await syncCourseIntakes(supabase, courseId, intakes, intakeStatus);

  await persistCourseCatalogSuggestions(supabase, {
    courseName: optionalTrimmed(formData, "courseName"),
    degree: optionalTrimmed(formData, "degree"),
    duration: optionalTrimmed(formData, "duration"),
    field: optionalTrimmed(formData, "field"),
  });

  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
  revalidatePath(`/dashboard/admin/universities/courses/${courseId}/edit`);
  redirect(universitiesAdminRoutes.manage);
}

export async function deleteCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseId = required(formData, "courseId");
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function deleteUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");
  const { error } = await supabase.from("universities").delete().eq("id", universityId);
  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}
