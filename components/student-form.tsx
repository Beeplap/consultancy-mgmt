import { createStudentAction } from "@/lib/actions/students";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function StudentForm() {
  return (
    <form action={createStudentAction} className="grid gap-8">
      <section className="grid gap-4">
        <h2 className="text-base font-semibold">Personal Info</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name"><Input name="name" required /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Phone"><Input name="phone" required /></Field>
          <Field label="Nationality"><Input name="nationality" defaultValue="Nepalese" required /></Field>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold">Academic</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Qualification"><Select name="qualification" defaultValue="Bachelor"><option>12th</option><option>Bachelor</option></Select></Field>
          <Field label="GPA / Percentage"><Input name="gpa" type="number" step="0.1" min="0" max="100" required /></Field>
          <Field label="Backlogs"><Input name="backlogs" type="number" min="0" defaultValue="0" required /></Field>
          <Field label="Year"><Input name="year" type="number" defaultValue="2025" required /></Field>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold">English Test</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="IELTS"><Input name="ielts" type="number" step="0.1" min="0" max="9" required /></Field>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold">Preferences</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Preferred Course"><Input name="preferred_course" placeholder="IT, Business, Health..." required /></Field>
          <Field label="Budget Range"><Input name="budget" type="number" min="0" required /></Field>
          <Field label="Preferred Intake"><Select name="intake" defaultValue="Sep"><option>Jan</option><option>May</option><option>Sep</option></Select></Field>
          <Field label="Preferred City"><Input name="preferred_city" placeholder="London, Manchester..." /></Field>
          <label className="flex items-center gap-3 pt-7 text-sm font-medium text-zinc-800">
            <input name="scholarship" type="checkbox" className="size-4 accent-black" />
            Scholarship required
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button>Save student</Button>
      </div>
    </form>
  );
}
