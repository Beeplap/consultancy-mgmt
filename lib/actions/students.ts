"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { IntakeName, StudentStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export async function createStudentAction(formData: FormData) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("students")
    .insert({
      name: required(formData, "name"),
      email: required(formData, "email").toLowerCase(),
      phone: required(formData, "phone"),
      nationality: required(formData, "nationality"),
      qualification: required(formData, "qualification"),
      gpa: Number(required(formData, "gpa")),
      backlogs: Number(formData.get("backlogs") ?? 0),
      year: Number(required(formData, "year")),
      ielts: Number(required(formData, "ielts")),
      preferred_course: required(formData, "preferred_course"),
      budget: Number(required(formData, "budget")),
      intake: required(formData, "intake") as IntakeName,
      preferred_city: String(formData.get("preferred_city") ?? "").trim() || null,
      scholarship: formData.get("scholarship") === "on",
      status: "new",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(`/dashboard/students/${data.id}`);
}

export async function updateStudentStatusAction(formData: FormData) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const studentId = required(formData, "studentId");
  const status = required(formData, "status") as StudentStatus;

  const { error } = await supabase.from("students").update({ status }).eq("id", studentId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/students/${studentId}`);
}
