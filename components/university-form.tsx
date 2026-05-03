import { createUniversityCourseAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function UniversityCourseForm() {
  return (
    <form action={createUniversityCourseAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="University"><Input name="universityName" required /></Field>
        <Field label="UK City"><Input name="location" required /></Field>
        <Field label="Ranking"><Input name="ranking" type="number" min="1" /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Course"><Input name="courseName" required /></Field>
        <Field label="Degree"><Select name="degree"><option>BSc</option><option>MSc</option><option>MBA</option></Select></Field>
        <Field label="Duration"><Input name="duration" defaultValue="1 year" required /></Field>
        <Field label="Field"><Input name="field" placeholder="IT, Business, Health" required /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Minimum GPA"><Input name="min_gpa" type="number" step="0.1" required /></Field>
        <Field label="Minimum IELTS"><Input name="min_ielts" type="number" step="0.1" required /></Field>
        <Field label="IELTS Waiver">
          <Select name="ielts_waiver" defaultValue="none">
            <option value="none">No waiver</option>
            <option value="b_or_above">B or above</option>
            <option value="c_plus_limited">C+ limited</option>
          </Select>
        </Field>
        <Field label="Tuition Fee"><Input name="tuition_fee" type="number" required /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Intake"><Select name="intake"><option>Jan</option><option>May</option><option>Sep</option></Select></Field>
        <Field label="Intake Status"><Select name="intake_status"><option value="open">Open</option><option value="closing">Closing</option><option value="closed">Closed</option></Select></Field>
      </div>
      <div className="flex justify-end"><Button>Add university course</Button></div>
    </form>
  );
}
