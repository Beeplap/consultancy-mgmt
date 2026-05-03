/** Alphabetical preset lists for add/edit course flows. */

export const COURSE_NAME_PRESETS: readonly string[] = [
  "Accounting and Finance",
  "Architecture",
  "Artificial Intelligence and Robotics",
  "Business and Finance",
  "Business and Law",
  "Business Management",
  "Civil Engineering",
  "Computer Networking and Cyber Security",
  "Computer Science",
  "Cyber Security",
  "Data Science",
  "Economics",
  "Economics and Law",
  "Education",
  "Electrical and Electronic Engineering",
  "Fashion Design",
  "Health and Social Care",
  "Hospitality Management",
  "International Business",
  "International Relations",
  "Marketing",
  "Mechanical Engineering",
  "Medicine",
  "Nursing",
  "Pharmacy",
  "Psychology",
  "Public Health",
  "Software Engineering",
  "Sports Science",
  "Tourism and Travel Management",
  "Tourism Management",
].sort((a, b) => a.localeCompare(b));

export const DEGREE_PRESETS: readonly string[] = [
  "BA",
  "BA (Hons)",
  "BEng",
  "BEng (Hons)",
  "BMus",
  "BSc",
  "BSc (Hons)",
  "Foundation Year",
  "Graduate Diploma",
  "Integrated Masters",
  "LLB",
  "LLM",
  "MA",
  "MBA",
  "MEng",
  "MFIN",
  "MPhil",
  "MRes",
  "MSc",
  "PgCert",
  "PgDip",
  "PhD",
  "Professional Doctorate",
].sort((a, b) => a.localeCompare(b));

/** Ordered shortest → longest — letter jump still applies to first character. */
export const DURATION_PRESETS: readonly string[] = [
  "3 months",
  "6 months",
  "9 months",
  "12 months",
  "1 semester",
  "2 semesters",
  "18 months",
  "1 year",
  "15 months",
  "24 months",
  "2 years",
  "36 months",
  "3 years",
  "4 years",
  "Includes placement year",
  "Part-time flexible",
];

export const STUDY_FIELD_PRESETS: readonly string[] = [
  "Architecture and Built Environment",
  "Arts and Humanities",
  "Biomedical Sciences",
  "Business and Management",
  "Computing",
  "Creative Industries",
  "Education",
  "Engineering",
  "Environmental Sciences",
  "Fashion and Design",
  "Finance and Accounting",
  "Health Sciences",
  "Hospitality and Tourism",
  "International Studies",
  "IT and Information Systems",
  "Law",
  "Life Sciences",
  "Marketing and Communications",
  "Medicine",
  "Nursing and Allied Health",
  "Pharmacy",
  "Physical Sciences",
  "Psychology and Sociology",
  "Social Sciences",
  "Sports Sciences",
].sort((a, b) => a.localeCompare(b));

export function firstGroupingLetter(label: string) {
  const ch = label.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

export function groupByLetter(sortedOptions: readonly string[]) {
  const map = new Map<string, string[]>();
  for (const opt of sortedOptions) {
    const key = firstGroupingLetter(opt);
    const list = map.get(key);
    if (list) list.push(opt);
    else map.set(key, [opt]);
  }
  return map;
}
