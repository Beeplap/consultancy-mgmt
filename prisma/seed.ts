import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@consultancy.local" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@consultancy.local",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "counsellor@consultancy.local" },
    update: {},
    create: {
      name: "Counsellor User",
      email: "counsellor@consultancy.local",
      passwordHash,
      role: Role.COUNSELLOR,
    },
  });

  const universities = [
    {
      name: "University of Manchester",
      location: "Manchester",
      ranking: 32,
      courses: [
        {
          name: "Computer Science",
          degreeType: "MSC" as const,
          duration: "1 year",
          field: "IT",
          gpa: 65,
          ielts: 6.5,
          tuition: 28500,
          deposit: 3000,
          installments: "40% before CAS, 30% at enrolment, 30% in term two",
        },
      ],
    },
    {
      name: "Coventry University",
      location: "Coventry",
      ranking: 71,
      courses: [
        {
          name: "International Business Management",
          degreeType: "MBA" as const,
          duration: "1 year",
          field: "Business",
          gpa: 55,
          ielts: 6,
          tuition: 20500,
          deposit: 4000,
          installments: "Initial deposit plus two termly installments",
        },
      ],
    },
    {
      name: "University of Greenwich",
      location: "London",
      ranking: 98,
      courses: [
        {
          name: "Public Health",
          degreeType: "MSC" as const,
          duration: "1 year",
          field: "Health",
          gpa: 50,
          ielts: 6,
          tuition: 17850,
          deposit: 3000,
          installments: "50% before enrolment, remaining balance across two installments",
        },
      ],
    },
  ];

  for (const university of universities) {
    const created =
      (await prisma.university.findFirst({ where: { name: university.name } })) ??
      (await prisma.university.create({
        data: {
          name: university.name,
          location: university.location,
          ranking: university.ranking,
        },
      }));

    for (const course of university.courses) {
      const existing = await prisma.course.findFirst({
        where: { universityId: created.id, name: course.name },
      });
      if (existing) continue;

      await prisma.course.create({
        data: {
          name: course.name,
          degreeType: course.degreeType,
          duration: course.duration,
          field: course.field,
          universityId: created.id,
          requirement: {
            create: {
              minimumGpa: course.gpa,
              minimumIelts: course.ielts,
            },
          },
          fee: {
            create: {
              tuitionFee: course.tuition,
              depositAmount: course.deposit,
              initialDeposit: course.deposit,
              installmentDetails: course.installments,
            },
          },
          intakes: {
            create: [
              { season: "JAN", status: "OPEN" },
              { season: "MAY", status: "CLOSING_SOON" },
              { season: "SEP", status: "OPEN" },
            ],
          },
        },
      });
    }
  }

  await prisma.student.upsert({
    where: { email: "riya.sharma@example.com" },
    update: {},
    create: {
      name: "Riya Sharma",
      email: "riya.sharma@example.com",
      phone: "+9779800000001",
      nationality: "Nepalese",
      qualification: "BACHELOR",
      gpa: 68,
      backlogs: 0,
      academicYear: 2025,
      englishTest: "IELTS",
      englishScore: 7,
      courseInterest: "Computer Science",
      budget: 30000,
      preferredIntake: "SEP",
      preferredCity: "Manchester",
      scholarshipRequired: true,
      counsellorId: admin.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
