import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseWithUniversity, Database, EnglishGrade, Intake, IntakeName, Student } from "@/lib/database.types";

export type MatchingStudent = Student & {
  english_grade?: string | null;
  englishGrade?: string | null;
};

export type MatchingCriteria = {
  gpa?: number;
  englishGrade?: EnglishGrade | null;
  applyWithWaiver?: boolean;
  ielts?: number;
  budget?: number;
  intake?: IntakeName | "";
  preferredCourse?: string;
  preferredCity?: string;
};

export type IeltsWaiverStatus = "required" | "waived" | "limited";

export type Recommendation = {
  course: CourseWithUniversity;
  intake: Intake;
  score: number;
  ieltsWaiver: IeltsWaiverStatus;
};

const limitedWaiverMaxIeltsRequirement = 6;
const gradeRank: Record<EnglishGrade, number> = {
  E: 0,
  D: 1,
  C: 2,
  "C+": 3,
  B: 4,
  "B+": 5,
  A: 6,
  "A+": 7,
};

function normalizeEnglishGrade(student: MatchingStudent | MatchingCriteria) {
  const grade = "english_grade" in student ? student.english_grade ?? student.englishGrade : student.englishGrade;
  return (grade ?? "").trim().toUpperCase() as EnglishGrade | "";
}

export function getIeltsWaiverStatus(student: MatchingStudent | MatchingCriteria): IeltsWaiverStatus {
  const grade = normalizeEnglishGrade(student);

  if (grade && gradeRank[grade] >= gradeRank.B) {
    return "waived";
  }

  if (grade === "C+") {
    return "limited";
  }

  return "required";
}

function effectiveIeltsScore(student: MatchingStudent | MatchingCriteria) {
  const waiver = shouldApplyWithWaiver(student) ? getIeltsWaiverStatus(student) : "required";
  const ielts = student.ielts ?? 0;

  if (waiver === "waived") return Number.POSITIVE_INFINITY;
  if (waiver === "limited") return Math.max(ielts, limitedWaiverMaxIeltsRequirement);

  return ielts;
}

function preferenceMatch(course: CourseWithUniversity, student: MatchingStudent | MatchingCriteria) {
  const preference = ("preferred_course" in student ? student.preferred_course : student.preferredCourse ?? "").toLowerCase();
  if (!preference) return 0.7;

  const field = course.field ?? "";
  const haystack = `${course.name ?? ""} ${field} ${course.degree ?? ""}`.toLowerCase();

  return haystack.includes(preference) || preference.includes(field.toLowerCase()) ? 1 : 0.45;
}

function cityMatch(course: CourseWithUniversity, student: MatchingStudent | MatchingCriteria) {
  const preferredCity = "preferred_city" in student ? student.preferred_city : student.preferredCity;
  const loc = course.universities?.location;
  if (!preferredCity || !loc) return 0.7;

  return loc.toLowerCase().includes(preferredCity.toLowerCase()) ? 1 : 0.62;
}

function acceptsWaiver(course: CourseWithUniversity, waiver: IeltsWaiverStatus) {
  const policy = course.ielts_waiver ?? "none";
  if (waiver === "waived") return policy !== "none";
  if (waiver === "limited") return policy === "c_plus_limited";

  return false;
}

function shouldApplyWithWaiver(student: MatchingStudent | MatchingCriteria) {
  if ("applyWithWaiver" in student) return Boolean(student.applyWithWaiver);

  return Boolean(normalizeEnglishGrade(student));
}

export function isCourseEligible(student: MatchingStudent | MatchingCriteria, course: CourseWithUniversity, intake: Intake) {
  if (intake.status === "closed") return false;
  if (student.intake && intake.intake !== student.intake) return false;
  const minGpa = course.min_gpa;
  if (student.gpa !== undefined && minGpa != null && student.gpa < minGpa) return false;
  const fee = course.fee;
  if (student.budget !== undefined && fee != null && student.budget < fee) return false;

  if (shouldApplyWithWaiver(student)) {
    return acceptsWaiver(course, getIeltsWaiverStatus(student));
  }

  const minIelts = course.min_ielts;
  if (minIelts == null) return true;
  return student.ielts === undefined || student.ielts >= minIelts;
}

export function calculateMatchScore(student: MatchingStudent | MatchingCriteria, course: CourseWithUniversity, intake: Intake) {
  const ieltsScore = effectiveIeltsScore(student);
  const refGpa = course.min_gpa ?? student.gpa ?? 0;
  const refIelts = course.min_ielts ?? student.ielts ?? 0;
  const refFee = course.fee ?? student.budget ?? 0;

  const gpaHeadroom = Math.min(1, Math.max(0, (student.gpa ?? refGpa) - refGpa) / 20);
  const ieltsHeadroom = Number.isFinite(ieltsScore) ? Math.min(1, Math.max(0, ieltsScore - refIelts) / 2) : 1;
  const budgetHeadroom = Math.min(1, Math.max(0, (student.budget ?? refFee) - refFee) / Math.max(refFee, 1));
  const coursePreference = preferenceMatch(course, student);
  const cityPreference = cityMatch(course, student);
  const intakeWeight = intake.status === "open" ? 1 : 0.82;

  const score =
    100 *
    (0.3 * (0.72 + gpaHeadroom * 0.28) +
      0.24 * (0.68 + ieltsHeadroom * 0.32) +
      0.2 * (0.68 + budgetHeadroom * 0.32) +
      0.16 * coursePreference +
      0.06 * cityPreference +
      0.04 * intakeWeight);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function recommendCourses(student: MatchingStudent, courses: CourseWithUniversity[]): Recommendation[] {
  return rankCourses(student, courses);
}

function feeSortKey(course: CourseWithUniversity) {
  return course.fee ?? Number.POSITIVE_INFINITY;
}

export function rankCourses(criteria: MatchingStudent | MatchingCriteria, courses: CourseWithUniversity[]): Recommendation[] {
  return courses
    .flatMap((course) => {
      const intake = course.intakes.find((item) => (!criteria.intake || item.intake === criteria.intake) && item.status !== "closed");
      if (!intake || !isCourseEligible(criteria, course, intake)) return [];

      return [
        {
          course,
          intake,
          score: calculateMatchScore(criteria, course, intake),
          ieltsWaiver: shouldApplyWithWaiver(criteria) ? getIeltsWaiverStatus(criteria) : "required",
        },
      ];
    })
    .sort((a, b) => b.score - a.score || feeSortKey(a.course) - feeSortKey(b.course));
}

export async function fetchMatchingStudent(supabase: SupabaseClient<Database>, studentId: string) {
  const { data, error } = await supabase.from("students").select("*").eq("id", studentId).single();

  if (error) throw new Error(error.message);
  return data as MatchingStudent;
}

export async function fetchCandidateCourses(supabase: SupabaseClient<Database>, student: MatchingStudent) {
  const waiver = getIeltsWaiverStatus(student);
  let query = supabase
    .from("courses")
    .select("*, universities(*), intakes!inner(*)")
    .or(`min_gpa.is.null,min_gpa.lte.${student.gpa}`)
    .or(`fee.is.null,fee.lte.${student.budget}`)
    .eq("intakes.intake", student.intake)
    .neq("intakes.status", "closed")
    .order("fee", { ascending: true, nullsFirst: false });

  const ieltsLimit =
    waiver === "waived" ? null : waiver === "limited" ? Math.max(student.ielts, limitedWaiverMaxIeltsRequirement) : student.ielts;

  if (ieltsLimit !== null) {
    query = query.or(`min_ielts.is.null,min_ielts.lte.${ieltsLimit}`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithUniversity[];
}

export async function getRankedCourseRecommendations(supabase: SupabaseClient<Database>, studentId: string) {
  const student = await fetchMatchingStudent(supabase, studentId);
  const courses = await fetchCandidateCourses(supabase, student);

  return recommendCourses(student, courses);
}
