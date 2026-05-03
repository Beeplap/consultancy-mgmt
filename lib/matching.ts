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

  const haystack = `${course.name} ${course.field} ${course.degree}`.toLowerCase();

  return haystack.includes(preference) || preference.includes(course.field.toLowerCase()) ? 1 : 0.45;
}

function cityMatch(course: CourseWithUniversity, student: MatchingStudent | MatchingCriteria) {
  const preferredCity = "preferred_city" in student ? student.preferred_city : student.preferredCity;
  if (!preferredCity) return 0.7;

  return course.universities?.location.toLowerCase().includes(preferredCity.toLowerCase()) ? 1 : 0.62;
}

function acceptsWaiver(course: CourseWithUniversity, waiver: IeltsWaiverStatus) {
  if (waiver === "waived") return course.ielts_waiver !== "none";
  if (waiver === "limited") return course.ielts_waiver === "c_plus_limited";

  return false;
}

function shouldApplyWithWaiver(student: MatchingStudent | MatchingCriteria) {
  if ("applyWithWaiver" in student) return Boolean(student.applyWithWaiver);

  return Boolean(normalizeEnglishGrade(student));
}

export function isCourseEligible(student: MatchingStudent | MatchingCriteria, course: CourseWithUniversity, intake: Intake) {
  if (intake.status === "closed") return false;
  if (student.intake && intake.intake !== student.intake) return false;
  if (student.gpa !== undefined && student.gpa < course.min_gpa) return false;
  if (student.budget !== undefined && student.budget < course.tuition_fee) return false;

  if (shouldApplyWithWaiver(student)) {
    return acceptsWaiver(course, getIeltsWaiverStatus(student));
  }

  return student.ielts !== undefined && student.ielts >= course.min_ielts;
}

export function calculateMatchScore(student: MatchingStudent | MatchingCriteria, course: CourseWithUniversity, intake: Intake) {
  const ieltsScore = effectiveIeltsScore(student);
  const gpaHeadroom = Math.min(1, Math.max(0, (student.gpa ?? course.min_gpa) - course.min_gpa) / 20);
  const ieltsHeadroom = Number.isFinite(ieltsScore) ? Math.min(1, Math.max(0, ieltsScore - course.min_ielts) / 2) : 1;
  const budgetHeadroom = Math.min(1, Math.max(0, (student.budget ?? course.tuition_fee) - course.tuition_fee) / Math.max(course.tuition_fee, 1));
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
    .sort((a, b) => b.score - a.score || a.course.tuition_fee - b.course.tuition_fee);
}

export async function fetchMatchingStudent(supabase: SupabaseClient<Database>, studentId: string) {
  const { data, error } = await supabase.from("students").select("*").eq("id", studentId).single();

  if (error) throw new Error(error.message);
  return data as MatchingStudent;
}

export async function fetchCandidateCourses(supabase: SupabaseClient<Database>, student: MatchingStudent) {
  const waiver = getIeltsWaiverStatus(student);
  const query = supabase
    .from("courses")
    .select("*, universities(*), intakes!inner(*)")
    .lte("min_gpa", student.gpa)
    .lte("tuition_fee", student.budget)
    .eq("intakes.intake", student.intake)
    .neq("intakes.status", "closed")
    .order("tuition_fee", { ascending: true });

  const ieltsLimit =
    waiver === "waived" ? null : waiver === "limited" ? Math.max(student.ielts, limitedWaiverMaxIeltsRequirement) : student.ielts;

  const { data, error } = ieltsLimit === null ? await query : await query.lte("min_ielts", ieltsLimit);

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithUniversity[];
}

export async function getRankedCourseRecommendations(supabase: SupabaseClient<Database>, studentId: string) {
  const student = await fetchMatchingStudent(supabase, studentId);
  const courses = await fetchCandidateCourses(supabase, student);

  return recommendCourses(student, courses);
}
