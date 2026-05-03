import { IntakeStatus, type Course, type Fee, type Intake, type Requirement, type University } from "@prisma/client";

export type StudentForMatching = {
  gpa: number;
  englishScore: number;
  budget: number;
  preferredIntake: "JAN" | "MAY" | "SEP";
  courseInterest: string;
  preferredCity?: string | null;
};

export type CourseForMatching = Course & {
  university: University;
  requirement: Requirement | null;
  fee: Fee | null;
  intakes: Intake[];
};

export type Recommendation = {
  course: CourseForMatching;
  intake: Intake;
  score: number;
  reasons: string[];
};

function includesToken(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function scoreCourse(student: StudentForMatching, course: CourseForMatching): Recommendation | null {
  if (!course.requirement || !course.fee) return null;

  const intake = course.intakes.find(
    (item) => item.season === student.preferredIntake && item.status !== IntakeStatus.CLOSED,
  );
  if (!intake) return null;

  const gpaEligible = student.gpa >= course.requirement.minimumGpa;
  const englishEligible = student.englishScore >= course.requirement.minimumIelts;
  const budgetEligible = student.budget >= course.fee.tuitionFee;
  if (!gpaEligible || !englishEligible || !budgetEligible) return null;

  const gpaBuffer = Math.min(1, (student.gpa - course.requirement.minimumGpa) / 20);
  const englishBuffer = Math.min(1, (student.englishScore - course.requirement.minimumIelts) / 2);
  const budgetBuffer = Math.min(1, (student.budget - course.fee.tuitionFee) / Math.max(course.fee.tuitionFee, 1));
  const coursePreference =
    includesToken(course.name, student.courseInterest) || includesToken(course.field, student.courseInterest) ? 1 : 0.35;
  const cityPreference =
    student.preferredCity && includesToken(course.university.location, student.preferredCity) ? 1 : 0.65;

  const score = Math.round(
    100 *
      (0.3 * (0.75 + gpaBuffer * 0.25) +
        0.25 * (0.75 + englishBuffer * 0.25) +
        0.2 * (0.7 + budgetBuffer * 0.3) +
        0.15 * coursePreference +
        0.1 * cityPreference),
  );

  const reasons = [
    `GPA ${student.gpa} meets ${course.requirement.minimumGpa}`,
    `English ${student.englishScore} meets ${course.requirement.minimumIelts}`,
    `Budget covers ${course.fee.tuitionFee}`,
    `${intake.season} intake is ${intake.status.toLowerCase().replace("_", " ")}`,
  ];

  return { course, intake, score: Math.min(score, 100), reasons };
}

export function recommendCourses(student: StudentForMatching, courses: CourseForMatching[]) {
  return courses
    .map((course) => scoreCourse(student, course))
    .filter((result): result is Recommendation => Boolean(result))
    .sort((a, b) => b.score - a.score);
}
