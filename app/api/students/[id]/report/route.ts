import PDFDocument from "pdfkit";
import { requireUser } from "@/lib/auth";
import { currencyGBP, titleCase } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  await requireUser();
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { matchScore: "desc" },
        include: {
          intake: true,
          course: { include: { university: true, requirement: true, fee: true } },
        },
      },
    },
  });

  if (!student) {
    return new Response("Student not found", { status: 404 });
  }

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("UK Education Counselling Report", { underline: true });
    doc.moveDown();
    doc.fontSize(13).text(`Student: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Phone: ${student.phone}`);
    doc.text(`Nationality: ${student.nationality}`);
    doc.text(`Qualification: ${titleCase(student.qualification)} (${student.gpa}%)`);
    doc.text(`${student.englishTest}: ${student.englishScore}`);
    doc.text(`Preferred Course: ${student.courseInterest}`);
    doc.text(`Budget: ${currencyGBP(student.budget)}`);
    doc.text(`Preferred Intake: ${student.preferredIntake}`);
    doc.text(`Status: ${titleCase(student.status)}`);
    doc.moveDown();

    doc.fontSize(16).text("Recommended Universities");
    doc.moveDown(0.5);
    if (student.applications.length === 0) {
      doc.fontSize(11).text("No eligible recommendations found.");
    }

    student.applications.forEach((application, index) => {
      const fee = application.course.fee;
      doc.fontSize(12).text(`${index + 1}. ${application.course.university.name} - ${application.course.name}`, { continued: false });
      doc.fontSize(10).text(`Location: ${application.course.university.location}`);
      doc.text(`Tuition Fee: ${fee ? currencyGBP(fee.tuitionFee) : "N/A"}`);
      doc.text(`Deposit: ${fee ? currencyGBP(fee.depositAmount) : "N/A"}`);
      doc.text(`Intake: ${application.intake.season} (${titleCase(application.intake.status)})`);
      doc.text(`Match: ${application.matchScore}%`);
      doc.text(`Payment Plan: ${fee?.installmentDetails ?? "N/A"}`);
      doc.moveDown();
    });

    doc.end();
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${student.name.replaceAll(" ", "-").toLowerCase()}-recommendations.pdf"`,
    },
  });
}
