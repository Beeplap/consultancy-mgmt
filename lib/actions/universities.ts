"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";
import { persistCourseCatalogSuggestions } from "@/lib/catalog-custom-presets";
import { parseCsv } from "@/lib/csv";
import {
  type CourseCsvFieldKey,
  type CourseCsvMapping,
  parseCasDepositPolicy,
  parseIeltsWaiverPolicy,
  parseOptionAIntakes,
  parseOptionalNumber,
} from "@/lib/course-csv-import";
import type { CasDepositPolicy, IntakeName, IntakeStatus } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { removeUniversityCoverObject, uploadUniversityCover } from "@/lib/university-cover";

function revalidateUniversitiesAdmin() {
  revalidatePath(universitiesAdminRoutes.root);
  revalidatePath(universitiesAdminRoutes.add);
  revalidatePath(universitiesAdminRoutes.manage);
  revalidatePath(universitiesAdminRoutes.importCourses);
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

function optionalRequirementText(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw || null;
}

/** Preserves line breaks and internal spacing; empty / whitespace-only clears to null. */
function optionalDescription(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === undefined) return null;
  const text = typeof raw === "string" ? raw : String(raw);
  if (!text.trim()) return null;
  return text;
}

function optionalCoverFile(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (!(raw instanceof File) || raw.size === 0) return null;
  return raw;
}

const intakeNames: IntakeName[] = ["Jan", "May", "Sep", "Nov"];

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
  const { data: uni, error } = await supabase
    .from("universities")
    .insert({
      name: optionalTrimmed(formData, "name"),
      location: optionalTrimmed(formData, "location"),
      ranking: optionalNumber(formData, "ranking"),
      description: optionalDescription(formData, "description"),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const photo = optionalCoverFile(formData, "universityCover");
  try {
    if (photo) {
      const photoPath = await uploadUniversityCover(supabase, uni.id, photo);
      await supabase.from("universities").update({ photo_path: photoPath }).eq("id", uni.id);
    }
  } catch (cleanupErr) {
    await supabase.from("universities").delete().eq("id", uni.id);
    throw cleanupErr;
  }

  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
  redirect(`${universitiesAdminRoutes.add}?success=university`);
}

export async function updateUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");

  const { data: before } = await supabase.from("universities").select("photo_path").eq("id", universityId).maybeSingle();

  let nextPhotoPath: string | null = before?.photo_path ?? null;
  const removeCover = formData.get("removeUniversityCover") === "on";

  if (removeCover) {
    await removeUniversityCoverObject(supabase, nextPhotoPath);
    nextPhotoPath = null;
  } else {
    const replacement = optionalCoverFile(formData, "universityCover");
    if (replacement) {
      const newPath = await uploadUniversityCover(supabase, universityId, replacement);
      await removeUniversityCoverObject(supabase, nextPhotoPath);
      nextPhotoPath = newPath;
    }
  }

  const { error } = await supabase
    .from("universities")
    .update({
      name: optionalTrimmed(formData, "name"),
      location: optionalTrimmed(formData, "location"),
      ranking: optionalNumber(formData, "ranking"),
      description: optionalDescription(formData, "description"),
      photo_path: nextPhotoPath,
    })
    .eq("id", universityId);

  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

function mappedCell(row: Record<string, string>, mapping: CourseCsvMapping, key: CourseCsvFieldKey) {
  const header = mapping[key];
  if (!header) return null;
  const value = row[header];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (normalized === "not specified" || normalized === "n/a" || normalized === "na" || normalized === "-") {
    return null;
  }
  return trimmed;
}

function normalizeCourseImportName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function upsertCourseIntakes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  courseId: string,
  intakeItems: Array<{ intake: IntakeName; status: IntakeStatus }>,
) {
  if (intakeItems.length === 0) return;

  const { data: existingData, error: fetchError } = await supabase
    .from("intakes")
    .select("id, intake")
    .eq("course_id", courseId)
    .in(
      "intake",
      intakeItems.map((item) => item.intake),
    );

  if (fetchError) throw new Error(fetchError.message);

  const existingByIntake = new Map((existingData ?? []).map((row) => [row.intake as IntakeName, row.id]));
  const toInsert: Array<{ course_id: string; intake: IntakeName; status: IntakeStatus }> = [];

  for (const item of intakeItems) {
    const existingId = existingByIntake.get(item.intake);
    if (existingId) {
      const { error } = await supabase.from("intakes").update({ status: item.status }).eq("id", existingId);
      if (error) throw new Error(error.message);
    } else {
      toInsert.push({ course_id: courseId, intake: item.intake, status: item.status });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("intakes").insert(toInsert);
    if (error) throw new Error(error.message);
  }
}

export async function importUniversityCoursesCsvAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");
  const mappingRaw = required(formData, "mappingJson");
  const csvFile = formData.get("coursesCsv");

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    throw new Error("Please upload a CSV file.");
  }

  const mapping = JSON.parse(mappingRaw) as CourseCsvMapping;
  if (!mapping.courseName) {
    throw new Error("Course name mapping is required.");
  }

  const { data: university, error: uniError } = await supabase
    .from("universities")
    .select("id")
    .eq("id", universityId)
    .maybeSingle();
  if (uniError) throw new Error(uniError.message);
  if (!university) throw new Error("Selected university was not found.");

  const text = await csvFile.text();
  const parsed = parseCsv(text);
  if (parsed.rows.length === 0) {
    throw new Error("CSV has no data rows to import.");
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ row: number; message: string }> = [];

  const { data: existingCoursesRaw, error: existingCoursesError } = await supabase
    .from("courses")
    .select("id,name")
    .eq("university_id", universityId);
  if (existingCoursesError) throw new Error(existingCoursesError.message);

  const existingCourseByName = new Map(
    (existingCoursesRaw ?? [])
      .map((course) => [normalizeCourseImportName(course.name), course.id] as const)
      .filter(([name]) => Boolean(name)),
  );

  for (let idx = 0; idx < parsed.rows.length; idx += 1) {
    const row = parsed.rows[idx];
    const rowNumber = idx + 2;
    try {
      const courseName = mappedCell(row, mapping, "courseName");
      if (!courseName) throw new Error("Course name is empty for this row.");

      const ieltsWaiver = parseIeltsWaiverPolicy(mappedCell(row, mapping, "ielts_waiver"));
      const casDeposit = parseCasDepositPolicy(mappedCell(row, mapping, "cas_deposit"));
      const coursePayload = {
        university_id: universityId,
        name: courseName,
        degree: mappedCell(row, mapping, "degree"),
        duration: mappedCell(row, mapping, "duration"),
        field: mappedCell(row, mapping, "field"),
        min_gpa: mappedCell(row, mapping, "min_gpa"),
        min_ielts: mappedCell(row, mapping, "min_ielts"),
        min_pte: mappedCell(row, mapping, "min_pte"),
        ielts_waiver: ieltsWaiver,
        fee: parseOptionalNumber(mappedCell(row, mapping, "fee")),
        accepted_gap: mappedCell(row, mapping, "accepted_gap"),
        cas_deposit: casDeposit,
        cas_deposit_amount:
          casDeposit === "required" ? parseOptionalNumber(mappedCell(row, mapping, "cas_deposit_amount")) : null,
        scholarship_upto: parseOptionalNumber(mappedCell(row, mapping, "scholarship_upto")),
        description: mappedCell(row, mapping, "courseDescription"),
      };
      const courseUpdatePayload: Partial<typeof coursePayload> = { name: courseName };

      if (mapping.degree) courseUpdatePayload.degree = coursePayload.degree;
      if (mapping.duration) courseUpdatePayload.duration = coursePayload.duration;
      if (mapping.field) courseUpdatePayload.field = coursePayload.field;
      if (mapping.min_gpa) courseUpdatePayload.min_gpa = coursePayload.min_gpa;
      if (mapping.min_ielts) courseUpdatePayload.min_ielts = coursePayload.min_ielts;
      if (mapping.min_pte) courseUpdatePayload.min_pte = coursePayload.min_pte;
      if (mapping.ielts_waiver) courseUpdatePayload.ielts_waiver = coursePayload.ielts_waiver;
      if (mapping.fee) courseUpdatePayload.fee = coursePayload.fee;
      if (mapping.accepted_gap) courseUpdatePayload.accepted_gap = coursePayload.accepted_gap;
      if (mapping.cas_deposit) courseUpdatePayload.cas_deposit = coursePayload.cas_deposit;
      if (mapping.cas_deposit_amount) courseUpdatePayload.cas_deposit_amount = coursePayload.cas_deposit_amount;
      if (mapping.scholarship_upto) courseUpdatePayload.scholarship_upto = coursePayload.scholarship_upto;
      if (mapping.courseDescription) courseUpdatePayload.description = coursePayload.description;

      const normalizedCourseName = normalizeCourseImportName(courseName);
      const existingCourseId = existingCourseByName.get(normalizedCourseName);

      const intakeItems = parseOptionAIntakes(mappedCell(row, mapping, "intakes"));
      if (existingCourseId) {
        const { error: courseError } = await supabase.from("courses").update(courseUpdatePayload).eq("id", existingCourseId);
        if (courseError) throw new Error(courseError.message);

        await upsertCourseIntakes(supabase, existingCourseId, intakeItems);
        updated += 1;
      } else {
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .insert(coursePayload)
          .select("id")
          .single();
        if (courseError) throw new Error(courseError.message);

        existingCourseByName.set(normalizedCourseName, course.id);
        await upsertCourseIntakes(supabase, course.id, intakeItems);
        inserted += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");

  return {
    inserted,
    updated,
    failed,
    total: parsed.rows.length,
    errors: errors.slice(0, 30),
  };
}

function requiredNumber(formData: FormData, key: string) {
  const raw = required(formData, key);
  const parsed = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) throw new Error(`${key} must be a valid number`);
  return parsed;
}

export async function createManualUniversityCourseAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");

  const { data: university, error: uniError } = await supabase
    .from("universities")
    .select("id")
    .eq("id", universityId)
    .maybeSingle();
  if (uniError) throw new Error(uniError.message);
  if (!university) throw new Error("Selected university was not found.");

  const waiverRaw = required(formData, "ielts_waiver");
  const casRaw = required(formData, "cas_deposit") as CasDepositPolicy;
  const ieltsWaiver = parseIeltsWaiverPolicy(waiverRaw);
  if (!ieltsWaiver) throw new Error("Invalid IELTS waiver value.");

  const { data: course, error: insertError } = await supabase
    .from("courses")
    .insert({
      university_id: universityId,
      name: required(formData, "courseName"),
      degree: required(formData, "degree"),
      duration: required(formData, "duration"),
      field: required(formData, "field"),
      min_gpa: required(formData, "min_gpa"),
      min_ielts: required(formData, "min_ielts"),
      min_pte: optionalRequirementText(formData, "min_pte"),
      ielts_waiver: ieltsWaiver,
      fee: requiredNumber(formData, "fee"),
      accepted_gap: required(formData, "accepted_gap"),
      cas_deposit: casRaw === "required" ? "required" : "not_required",
      cas_deposit_amount: requiredNumber(formData, "cas_deposit_amount"),
      scholarship_upto: requiredNumber(formData, "scholarship_upto"),
      description: required(formData, "courseDescription"),
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const intakeRaw = required(formData, "intakes");
  const intakeItems = parseOptionAIntakes(intakeRaw);
  if (intakeItems.length === 0) {
    throw new Error("intakes is required. Example: Jan:open|May:closed|Sep:open");
  }

  const { error: intakeError } = await supabase.from("intakes").insert(
    intakeItems.map((item) => ({
      course_id: course.id,
      intake: item.intake,
      status: item.status,
    })),
  );
  if (intakeError) throw new Error(intakeError.message);

  await persistCourseCatalogSuggestions(supabase, {
    courseName: required(formData, "courseName"),
    degree: required(formData, "degree"),
    duration: required(formData, "duration"),
    field: required(formData, "field"),
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
  const ieltsWaiver = parseIeltsWaiverPolicy(waiverRaw);

  const { error } = await supabase
    .from("courses")
    .update({
      university_id: universityId,
      name: optionalTrimmed(formData, "courseName"),
      degree: optionalTrimmed(formData, "degree"),
      duration: optionalTrimmed(formData, "duration"),
      field: optionalTrimmed(formData, "field"),
      min_gpa: optionalRequirementText(formData, "min_gpa"),
      min_ielts: optionalRequirementText(formData, "min_ielts"),
      min_pte: optionalRequirementText(formData, "min_pte"),
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

export async function deleteManyCoursesAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseIds = formData
    .getAll("courseIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (courseIds.length === 0) throw new Error("Select at least one course to delete.");

  const { error } = await supabase.from("courses").delete().in("id", courseIds);
  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function bulkUpdateCourseIntakesAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const courseIds = formData
    .getAll("courseIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (courseIds.length === 0) throw new Error("Select at least one course to update.");

  const selectedIntakeNames = intakeNames.filter((name) => formData.get(`bulk_intake_${name}`) === "on");
  if (selectedIntakeNames.length === 0) throw new Error("Select at least one intake month to update.");

  const statusRaw = String(formData.get("bulk_intake_status") ?? "").trim();
  const intakeStatus: IntakeStatus =
    statusRaw === "open" || statusRaw === "closing" || statusRaw === "closed" ? statusRaw : "open";

  const { data: existingData, error: fetchError } = await supabase
    .from("intakes")
    .select("id, course_id, intake")
    .in("course_id", courseIds)
    .in("intake", selectedIntakeNames);

  if (fetchError) throw new Error(fetchError.message);

  const existingRows = existingData ?? [];
  const existingKeys = new Set(existingRows.map((row) => `${row.course_id}:${row.intake}`));
  const existingIds = existingRows.map((row) => row.id);

  if (existingIds.length > 0) {
    const { error } = await supabase.from("intakes").update({ status: intakeStatus }).in("id", existingIds);
    if (error) throw new Error(error.message);
  }

  const rowsToInsert = courseIds.flatMap((courseId) =>
    selectedIntakeNames
      .filter((intake) => !existingKeys.has(`${courseId}:${intake}`))
      .map((intake) => ({
        course_id: courseId,
        intake,
        status: intakeStatus,
      })),
  );

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("intakes").insert(rowsToInsert);
    if (error) throw new Error(error.message);
  }

  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}

export async function deleteUniversityAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const universityId = required(formData, "universityId");
  const { data: row } = await supabase.from("universities").select("photo_path").eq("id", universityId).maybeSingle();

  await removeUniversityCoverObject(supabase, row?.photo_path);

  const { error } = await supabase.from("universities").delete().eq("id", universityId);
  if (error) throw new Error(error.message);
  revalidateUniversitiesAdmin();
  revalidatePath("/dashboard/course-recommendations");
}
