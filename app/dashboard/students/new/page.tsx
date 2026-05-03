import { StudentForm } from "@/components/student-form";

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Add Student</h1>
        <p className="mt-1 text-sm text-zinc-600">Capture profile details and generate rule-based university recommendations.</p>
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <StudentForm />
      </section>
    </div>
  );
}
