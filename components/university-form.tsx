import { createUniversityCourseAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

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
        <Field label="Degree"><Select name="degreeType"><option value="BSC">BSc</option><option value="MSC">MSc</option><option value="MBA">MBA</option></Select></Field>
        <Field label="Duration"><Input name="duration" defaultValue="1 year" required /></Field>
        <Field label="Field"><Input name="field" placeholder="IT, Business, Health" required /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Minimum GPA"><Input name="minimumGpa" type="number" step="0.1" required /></Field>
        <Field label="Minimum IELTS"><Input name="minimumIelts" type="number" step="0.1" required /></Field>
        <Field label="Tuition Fee"><Input name="tuitionFee" type="number" required /></Field>
        <Field label="Deposit"><Input name="depositAmount" type="number" required /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Initial Deposit"><Input name="initialDeposit" type="number" required /></Field>
        <Field label="Intake"><Select name="intakeSeason"><option value="JAN">Jan</option><option value="MAY">May</option><option value="SEP">Sep</option></Select></Field>
        <Field label="Intake Status"><Select name="intakeStatus"><option value="OPEN">Open</option><option value="CLOSING_SOON">Closing Soon</option><option value="CLOSED">Closed</option></Select></Field>
      </div>
      <Field label="Installment details"><Textarea name="installmentDetails" required /></Field>
      <div className="flex justify-end"><Button>Add university course</Button></div>
    </form>
  );
}
