import type { CourseWithUniversity, Intake, Student } from "@/lib/database.types";

export type Recommendation = {
  course: CourseWithUniversity;
  intake: Intake;
  score: number;
};

function preferenceMatch(course: CourseWithUniversity, student: Student) {
  const preference = student.preferred_course.toLowerCase();
  const haystack = `${course.name} ${course.field}`.toLowerCase();
  return haystack.includes(preference) || preference.includes(course.field.toLowerCase()) ? 1 : 0.45;
}

export function calculateMatchScore(student: Student, course: CourseWithUniversity, intake: Intake) {
  const gpaHeadroom = Math.min(1, Math.max(0, student.gpa - course.min_gpa) / 20);
  const ieltsHeadroom = Math.min(1, Math.max(0, student.ielts - course.min_ielts) / 2);
  const budgetHeadroom = Math.min(1, Math.max(0, student.budget - course.tuition_fee) / Math.max(course.tuition_fee, 1));
  const coursePreference = preferenceMatch(course, student);
  const cityPreference =
    student.preferred_city && course.universities?.location.toLowerCase().includes(student.preferred_city.toLowerCase()) ? 1 : 0.7;
  const intakeWeight = intake.status === "open" ? 1 : 0.82;

  return Math.round(
    100 *
      (0.28 * (0.75 + gpaHeadroom * 0.25) +
        0.24 * (0.75 + ieltsHeadroom * 0.25) +
        0.2 * (0.7 + budgetHeadroom * 0.3) +
        0.16 * coursePreference +
        0.07 * cityPreference +
        0.05 * intakeWeight),
  );
}

export function recommendCourses(student: Student, courses: CourseWithUniversity[]) {
  return courses
    .flatMap((course) => {
      const intake = course.intakes.find((item) => item.intake === student.intake && item.status !== "closed");
      if (!intake) return [];
      if (student.gpa < course.min_gpa) return [];
      if (student.ielts < course.min_ielts) return [];
      if (student.budget < course.tuition_fee) return [];
      return [{ course, intake, score: calculateMatchScore(student, course, intake) }];
    })
    .sort((a, b) => b.score - a.score);
}
