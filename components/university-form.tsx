import { createUniversityCourseAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

type UniversityOption = { id: string; name: string | null };

export function UniversityCourseForm({ universities }: { universities: UniversityOption[] }) {
  return (
    <form action={createUniversityCourseAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="University">
          <Select name="university_id" defaultValue="">
            <option value="">New university (fill details below)</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.trim() || "Unnamed university"}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-zinc-500">All fields are optional. Choose an existing university or leave “New university” and enter details to create one.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="University name">
          <Input name="universityName" placeholder="Only used for new university" />
        </Field>
        <Field label="UK city">
          <Input name="location" placeholder="Only used for new university" />
        </Field>
        <Field label="Ranking">
          <Input name="ranking" type="number" min="1" />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Course">
          <Input name="courseName" />
        </Field>
        <Field label="Degree">
          <Select name="degree" defaultValue="">
            <option value="">—</option>
            <option>BSc</option>
            <option>BA</option>
            <option>BEng</option>
            <option>MSc</option>
            <option>MBA</option>
          </Select>
        </Field>
        <Field label="Duration">
          <Input name="duration" placeholder="e.g. 1 year" />
        </Field>
        <Field label="Field">
          <Input name="field" placeholder="IT, Business, Health" />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Minimum GPA">
          <Input name="min_gpa" type="number" step="0.1" />
        </Field>
        <Field label="Minimum IELTS">
          <Input name="min_ielts" type="number" step="0.1" />
        </Field>
        <Field label="IELTS waiver">
          <Select name="ielts_waiver" defaultValue="">
            <option value="">—</option>
            <option value="none">No waiver</option>
            <option value="b_or_above">B or above</option>
            <option value="c_plus_limited">C+ limited</option>
          </Select>
        </Field>
        <Field label="Fee">
          <Input name="fee" type="number" placeholder="GBP" />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Accepted study gap">
          <Input name="accepted_gap" placeholder="e.g. Up to 2 years" />
        </Field>
        <Field label="CAS deposit">
          <Select name="cas_deposit" defaultValue="not_required">
            <option value="not_required">Not required</option>
            <option value="required">Required</option>
          </Select>
        </Field>
        <Field label="Scholarship up to (£)">
          <Input name="scholarship_upto" type="number" placeholder="Optional cap" />
        </Field>
      </div>
      <div className="grid gap-3">
        <span className="text-sm font-medium text-zinc-800">Intakes (select any that apply)</span>
        <div className="flex flex-wrap gap-6">
          {(["Jan", "May", "Sep"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name={`intake_${m}`} className="h-4 w-4 rounded border-zinc-300" />
              {m}
            </label>
          ))}
        </div>
        <Field label="Status for selected intakes">
          <Select name="intake_status" defaultValue="open">
            <option value="open">Open</option>
            <option value="closing">Closing</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Add course to university</Button>
      </div>
    </form>
  );
}
