"use server";

import { DegreeType, IntakeSeason, IntakeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const universityCourseSchema = z.object({
  universityName: z.string().min(2),
  location: z.string().min(2),
  ranking: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  courseName: z.string().min(2),
  degreeType: z.enum(DegreeType),
  duration: z.string().min(2),
  field: z.string().min(2),
  minimumGpa: z.coerce.number().min(0).max(100),
  minimumIelts: z.coerce.number().min(0).max(9),
  tuitionFee: z.coerce.number().int().min(0),
  depositAmount: z.coerce.number().int().min(0),
  initialDeposit: z.coerce.number().int().min(0),
  installmentDetails: z.string().min(3),
  intakeSeason: z.enum(IntakeSeason),
  intakeStatus: z.enum(IntakeStatus),
});

export async function createUniversityCourseAction(formData: FormData) {
  await requireAdmin();
  const parsed = universityCourseSchema.parse({
    universityName: formData.get("universityName"),
    location: formData.get("location"),
    ranking: formData.get("ranking") || "",
    courseName: formData.get("courseName"),
    degreeType: formData.get("degreeType"),
    duration: formData.get("duration"),
    field: formData.get("field"),
    minimumGpa: formData.get("minimumGpa"),
    minimumIelts: formData.get("minimumIelts"),
    tuitionFee: formData.get("tuitionFee"),
    depositAmount: formData.get("depositAmount"),
    initialDeposit: formData.get("initialDeposit"),
    installmentDetails: formData.get("installmentDetails"),
    intakeSeason: formData.get("intakeSeason"),
    intakeStatus: formData.get("intakeStatus"),
  });

  const university =
    (await prisma.university.findFirst({
      where: { name: { equals: parsed.universityName, mode: "insensitive" } },
    })) ??
    (await prisma.university.create({
      data: {
        name: parsed.universityName,
        location: parsed.location,
        ranking: parsed.ranking,
      },
    }));

  await prisma.course.create({
    data: {
      name: parsed.courseName,
      degreeType: parsed.degreeType,
      duration: parsed.duration,
      field: parsed.field,
      universityId: university.id,
      requirement: {
        create: {
          minimumGpa: parsed.minimumGpa,
          minimumIelts: parsed.minimumIelts,
        },
      },
      fee: {
        create: {
          tuitionFee: parsed.tuitionFee,
          depositAmount: parsed.depositAmount,
          initialDeposit: parsed.initialDeposit,
          installmentDetails: parsed.installmentDetails,
        },
      },
      intakes: {
        create: {
          season: parsed.intakeSeason,
          status: parsed.intakeStatus,
        },
      },
    },
  });

  revalidatePath("/dashboard/admin/universities");
}

export async function updateIntakeStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("intakeId"));
  const status = z.enum(IntakeStatus).parse(formData.get("status"));
  await prisma.intake.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/admin/universities");
}

export async function deleteCourseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("courseId"));
  await prisma.course.delete({ where: { id } });
  revalidatePath("/dashboard/admin/universities");
}
