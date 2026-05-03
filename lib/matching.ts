import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseWithUniversity, Database, Intake, Student } from "@/lib/database.types";

export type MatchingStudent = Student & {
  english_grade?: string | null;
  englishGrade?: string | null;
};

export type IeltsWaiverStatus = "required" | "waived" | "limited";

export type Recommendation = {
  course: CourseWithUniversity;
  intake: Intake;
  score: number;
  ieltsWaiver: IeltsWaiverStatus;
};

const limitedWaiverMaxIeltsRequirement = 6;

function normalizeEnglishGrade(student: MatchingStudent) {
  return (student.english_grade ?? student.englishGrade ?? "").trim().toUpperCase();
}

export function getIeltsWaiverStatus(student: MatchingStudent): IeltsWaiverStatus {
  const grade = normalizeEnglishGrade(student);

  if (grade === "B" || grade === "B+" || grade === "A" || grade === "A+") {
    return "waived";
  }

  if (grade === "C+") {
    return "limited";
  }

  return "required";
}

function effectiveIeltsScore(student: MatchingStudent) {
  const waiver = getIeltsWaiverStatus(student);

  if (waiver === "waived") return Number.POSITIVE_INFINITY;
  if (waiver === "limited") return Math.max(student.ielts, limitedWaiverMaxIeltsRequirement);

  return student.ielts;
}

function preferenceMatch(course: CourseWithUniversity, student: MatchingStudent) {
  const preference = student.preferred_course.toLowerCase();
  const haystack = `${course.name} ${course.field} ${course.degree}`.toLowerCase();

  return haystack.includes(preference) || preference.includes(course.field.toLowerCase()) ? 1 : 0.45;
}

function cityMatch(course: CourseWithUniversity, student: MatchingStudent) {
  if (!student.preferred_city) return 0.7;

  return course.universities?.location.toLowerCase().includes(student.preferred_city.toLowerCase()) ? 1 : 0.62;
}

export function isCourseEligible(student: MatchingStudent, course: CourseWithUniversity, intake: Intake) {
  if (intake.status === "closed") return false;
  if (intake.intake !== student.intake) return false;
  if (student.gpa < course.min_gpa) return false;
  if (student.budget < course.tuition_fee) return false;

  const waiver = getIeltsWaiverStatus(student);
  if (waiver === "waived") return true;
  if (waiver === "limited" && course.min_ielts <= limitedWaiverMaxIeltsRequirement) return true;

  return student.ielts >= course.min_ielts;
}

export function calculateMatchScore(student: MatchingStudent, course: CourseWithUniversity, intake: Intake) {
  const ieltsScore = effectiveIeltsScore(student);
  const gpaHeadroom = Math.min(1, Math.max(0, student.gpa - course.min_gpa) / 20);
  const ieltsHeadroom = Number.isFinite(ieltsScore) ? Math.min(1, Math.max(0, ieltsScore - course.min_ielts) / 2) : 1;
  const budgetHeadroom = Math.min(1, Math.max(0, student.budget - course.tuition_fee) / Math.max(course.tuition_fee, 1));
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
  return courses
    .flatMap((course) => {
      const intake = course.intakes.find((item) => item.intake === student.intake && item.status !== "closed");
      if (!intake || !isCourseEligible(student, course, intake)) return [];

      return [
        {
          course,
          intake,
          score: calculateMatchScore(student, course, intake),
          ieltsWaiver: getIeltsWaiverStatus(student),
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
