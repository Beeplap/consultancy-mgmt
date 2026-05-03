"use server";

import { ApplicationStatus, Qualification } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { recommendCourses } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

const studentSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().min(5),
  nationality: z.string().min(2),
  qualification: z.enum(Qualification),
  gpa: z.coerce.number().min(0).max(100),
  backlogs: z.coerce.number().int().min(0),
  academicYear: z.coerce.number().int().min(1990).max(2100),
  englishTest: z.string().min(3),
  englishScore: z.coerce.number().min(0).max(9),
  courseInterest: z.string().min(2),
  budget: z.coerce.number().int().min(0),
  preferredIntake: z.enum(["JAN", "MAY", "SEP"]),
  preferredCity: z.string().optional(),
  scholarshipRequired: z.coerce.boolean().default(false),
});

export async function createStudentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = studentSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    nationality: formData.get("nationality"),
    qualification: formData.get("qualification"),
    gpa: formData.get("gpa"),
    backlogs: formData.get("backlogs"),
    academicYear: formData.get("academicYear"),
    englishTest: formData.get("englishTest"),
    englishScore: formData.get("englishScore"),
    courseInterest: formData.get("courseInterest"),
    budget: formData.get("budget"),
    preferredIntake: formData.get("preferredIntake"),
    preferredCity: formData.get("preferredCity"),
    scholarshipRequired: formData.get("scholarshipRequired") === "on",
  });

  const student = await prisma.student.create({
    data: {
      ...parsed,
      email: parsed.email.toLowerCase(),
      counsellorId: user.id,
    },
  });

  await regenerateRecommendations(student.id);
  revalidatePath("/dashboard");
  redirect(`/dashboard/students/${student.id}`);
}

export async function regenerateRecommendations(studentId: string) {
  await requireUser();
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  const courses = await prisma.course.findMany({
    include: {
      university: true,
      requirement: true,
      fee: true,
      intakes: true,
    },
  });

  const recommendations = recommendCourses(
    {
      gpa: student.gpa,
      englishScore: student.englishScore,
      budget: student.budget,
      preferredIntake: student.preferredIntake,
      courseInterest: student.courseInterest,
      preferredCity: student.preferredCity,
    },
    courses,
  );

  await prisma.$transaction([
    prisma.application.deleteMany({ where: { studentId, shortlisted: false } }),
    ...recommendations.slice(0, 12).map((recommendation) =>
      prisma.application.upsert({
        where: {
          studentId_courseId_intakeId: {
            studentId,
            courseId: recommendation.course.id,
            intakeId: recommendation.intake.id,
          },
        },
        update: { matchScore: recommendation.score },
        create: {
          studentId,
          courseId: recommendation.course.id,
          intakeId: recommendation.intake.id,
          matchScore: recommendation.score,
        },
      }),
    ),
  ]);
}

export async function updateStudentStatusAction(formData: FormData) {
  await requireUser();
  const studentId = String(formData.get("studentId"));
  const status = z.enum(ApplicationStatus).parse(formData.get("status"));
  await prisma.student.update({ where: { id: studentId }, data: { status } });
  revalidatePath(`/dashboard/students/${studentId}`);
}

export async function shortlistAction(formData: FormData) {
  await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const studentId = String(formData.get("studentId"));
  await prisma.application.update({
    where: { id: applicationId },
    data: { shortlisted: true },
  });
  revalidatePath(`/dashboard/students/${studentId}`);
}

export async function addNoteAction(formData: FormData) {
  const user = await requireUser();
  const studentId = String(formData.get("studentId"));
  const body = z.string().min(2).parse(formData.get("body"));
  await prisma.note.create({
    data: { studentId, body, authorId: user.id },
  });
  revalidatePath(`/dashboard/students/${studentId}`);
}
