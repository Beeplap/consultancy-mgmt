import type { CasDepositPolicy, IeltsWaiverPolicy, IntakeName, IntakeStatus } from "@/lib/database.types";

export const courseCsvFieldDefinitions = [
  { key: "courseName", label: "Course name", required: true },
  { key: "degree", label: "Degree", required: false },
  { key: "duration", label: "Duration", required: false },
  { key: "field", label: "Field/Subject", required: false },
  { key: "min_gpa", label: "Minimum GPA", required: false },
  { key: "min_ielts", label: "Minimum IELTS", required: false },
  { key: "min_pte", label: "Minimum PTE", required: false },
  { key: "ielts_waiver", label: "IELTS waiver policy", required: false },
  { key: "fee", label: "Tuition fee", required: false },
  { key: "accepted_gap", label: "Accepted gap", required: false },
  { key: "cas_deposit", label: "CAS deposit policy", required: false },
  { key: "cas_deposit_amount", label: "CAS deposit amount", required: false },
  { key: "scholarship_upto", label: "Scholarship up to", required: false },
  { key: "courseDescription", label: "Course description", required: false },
  { key: "intakes", label: "Intakes (Option A: Jan:open|May:closed)", required: false },
] as const;

export type CourseCsvFieldKey = (typeof courseCsvFieldDefinitions)[number]["key"];
export type CourseCsvMapping = Partial<Record<CourseCsvFieldKey, string>>;

export function normalizeFieldName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function autoMapCsvHeaders(headers: string[]): CourseCsvMapping {
  const byNormalized = new Map(headers.map((h) => [normalizeFieldName(h), h]));
  const aliases: Record<CourseCsvFieldKey, string[]> = {
    courseName: ["course", "courses", "coursename", "program", "programname"],
    degree: ["degree", "level"],
    duration: ["duration", "length", "courseduration"],
    field: ["field", "subject", "area", "category"],
    min_gpa: ["mingpa", "gpa", "minimumgpa"],
    min_ielts: ["minielts", "ielts", "minimumielts"],
    min_pte: ["minpte", "pte", "minimumpte", "pterequirement", "minimumptescore"],
    ielts_waiver: ["ieltswaiver", "waiver", "waiverpolicy"],
    fee: ["fee", "tuition", "tuitionfee", "cost"],
    accepted_gap: ["acceptedgap", "gap", "studygap"],
    cas_deposit: ["casdeposit", "caspolicy"],
    cas_deposit_amount: ["casdepositamount", "casamount"],
    scholarship_upto: ["scholarship", "scholarshipupto"],
    courseDescription: ["description", "coursedescription", "details"],
    intakes: ["intakes", "intake", "intakestatus", "intakesoptiona"],
  };

  const out: CourseCsvMapping = {};
  for (const def of courseCsvFieldDefinitions) {
    const match = aliases[def.key].find((alias) => byNormalized.has(alias));
    if (match) out[def.key] = byNormalized.get(match);
  }
  return out;
}

export function parseOptionalNumber(input: string | null | undefined) {
  const text = (input ?? "").trim();
  if (!text) return null;
  const cleaned = text.replace(/,/g, "");
  const direct = Number(cleaned);
  if (Number.isFinite(direct)) return direct;
  const firstNumber = cleaned.match(/-?\d+(\.\d+)?/);
  if (!firstNumber) return null;
  const parsed = Number(firstNumber[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIeltsWaiverPolicy(input: string | null | undefined): IeltsWaiverPolicy | null {
  const text = (input ?? "").trim().toLowerCase();
  if (!text) return null;
  if (["none", "no", "no waiver"].includes(text)) return "none";
  if (["b_or_above", "b or above", "borabove", "waiver", "b", "a", "a+", "b+"].includes(text)) return "b_or_above";
  if (["c_plus_limited", "c+ limited", "cpluslimited", "c+limited"].includes(text)) return "c_plus_limited";
  return null;
}

export function parseCasDepositPolicy(input: string | null | undefined): CasDepositPolicy {
  const text = (input ?? "").trim().toLowerCase();
  if (["required", "yes", "true", "1"].includes(text)) return "required";
  return "not_required";
}

function toIntakeName(input: string): IntakeName | null {
  const text = input.trim().toLowerCase();
  if (text === "jan" || text === "january") return "Jan";
  if (text === "may") return "May";
  if (text === "sep" || text === "sept" || text === "september") return "Sep";
  if (text === "nov" || text === "november") return "Nov";
  return null;
}

function toIntakeStatus(input: string): IntakeStatus | null {
  const text = input.trim().toLowerCase();
  if (text === "open") return "open";
  if (text === "closed") return "closed";
  if (text === "closing") return "closing";
  return null;
}

export function parseOptionAIntakes(raw: string | null | undefined): Array<{ intake: IntakeName; status: IntakeStatus }> {
  const text = (raw ?? "").trim();
  if (!text) return [];
  const normalized = text.replace(/[;,]+/g, "|");
  const tokens = normalized.split("|").map((t) => t.trim()).filter(Boolean);
  const map = new Map<IntakeName, IntakeStatus>();

  for (const token of tokens) {
    const [namePart, statusPart] = token.split(":").map((x) => x.trim());
    const intake = toIntakeName(namePart ?? "");
    if (!intake) continue;
    const status = toIntakeStatus(statusPart ?? "") ?? "open";
    map.set(intake, status);
  }

  return [...map.entries()].map(([intake, status]) => ({ intake, status }));
}
