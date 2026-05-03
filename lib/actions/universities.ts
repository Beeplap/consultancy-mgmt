"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { IeltsWaiverPolicy, IntakeName, IntakeStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export async function createUniversityCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const universityId = String(formData.get("university_id") ?? "");
  let resolvedUniversityId = universityId;

  if (!resolvedUniversityId) {
    const { data, error } = await supabase
      .from("universities")
      .insert({
        name: required(formData, "universityName"),
        location: required(formData, "location"),
        ranking: formData.get("ranking") ? Number(formData.get("ranking")) : null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    resolvedUniversityId = data.id;
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      university_id: resolvedUniversityId,
      name: required(formData, "courseName"),
      degree: required(formData, "degree"),
      duration: required(formData, "duration"),
      field: required(formData, "field"),
      min_gpa: Number(required(formData, "min_gpa")),
      min_ielts: Number(required(formData, "min_ielts")),
      ielts_waiver: required(formData, "ielts_waiver") as IeltsWaiverPolicy,
      tuition_fee: Number(required(formData, "tuition_fee")),
    })
    .select("id")
    .single();

  if (courseError) throw new Error(courseError.message);

  const { error: intakeError } = await supabase.from("intakes").insert({
    course_id: course.id,
    intake: required(formData, "intake") as IntakeName,
    status: required(formData, "intake_status") as IntakeStatus,
  });

  if (intakeError) throw new Error(intakeError.message);
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
