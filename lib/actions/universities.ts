"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { CasDepositPolicy, IeltsWaiverPolicy, IntakeName, IntakeStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const intakeNames: IntakeName[] = ["Jan", "May", "Sep"];

function selectedIntakes(formData: FormData): IntakeName[] {
  const selected: IntakeName[] = [];
  for (const name of intakeNames) {
    if (formData.get(`intake_${name}`) === "on") selected.push(name);
  }
  return selected;
}

export async function createUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("universities").insert({
    name: optionalTrimmed(formData, "name"),
    location: optionalTrimmed(formData, "location"),
    ranking: optionalNumber(formData, "ranking"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
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
    })
    .eq("id", universityId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
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

  revalidatePath("/dashboard/admin/universities");
}

export async function updateCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseId = required(formData, "courseId");

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
    })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
}

export async function updateIntakeStatusAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const intakeId = required(formData, "intakeId");
  const status = required(formData, "status") as IntakeStatus;
  const { error } = await supabase.from("intakes").update({ status }).eq("id", intakeId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
}

export async function deleteCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseId = required(formData, "courseId");
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
}

export async function deleteUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");
  const { error } = await supabase.from("universities").delete().eq("id", universityId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/universities");
}
