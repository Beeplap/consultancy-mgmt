export type UserRole = "admin" | "counsellor";
export type StudentStatus = "new" | "applied" | "offer" | "visa" | "enrolled";
export type IntakeName = "Jan" | "May" | "Sep";
export type IntakeStatus = "open" | "closed" | "closing";
export type EnglishGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "E";
export type IeltsWaiverPolicy = "none" | "b_or_above" | "c_plus_limited";
export type CasDepositPolicy = "not_required" | "required";

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string | null;
  qualification: string;
  gpa: number;
  backlogs: number;
  year: number;
  english_grade: EnglishGrade | null;
  ielts: number;
  preferred_course: string;
  budget: number;
  intake: IntakeName;
  preferred_city: string | null;
  scholarship: boolean;
  status: StudentStatus;
  created_at?: string;
};

export type University = {
  id: string;
  name: string | null;
  location: string | null;
  ranking: number | null;
  description: string | null;
  /** Supabase Storage object path inside bucket `university-covers`. */
  photo_path: string | null;
  created_at?: string;
};

export type Course = {
  id: string;
  university_id: string;
  name: string | null;
  degree: string | null;
  duration: string | null;
  field: string | null;
  min_gpa: string | null;
  min_ielts: string | null;
  ielts_waiver: IeltsWaiverPolicy | null;
  fee: number | null;
  accepted_gap: string | null;
  cas_deposit: CasDepositPolicy;
  cas_deposit_amount: number | null;
  scholarship_upto: number | null;
  description: string | null;
  created_at?: string;
};

export type Intake = {
  id: string;
  course_id: string;
  intake: IntakeName;
  status: IntakeStatus;
  created_at?: string;
};

export type Application = {
  id: string;
  student_id: string;
  course_id: string;
  status: StudentStatus;
  created_at?: string;
};

export type CustomCatalogPresetKind = "course_name" | "degree" | "duration" | "field";

export type CustomCatalogPreset = {
  id: string;
  kind: CustomCatalogPresetKind;
  label: string;
  created_at?: string;
};

export type CourseWithUniversity = Course & {
  universities: University | null;
  intakes: Intake[];
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at">;
        Update: Partial<Omit<UserProfile, "id" | "created_at">>;
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: Omit<Student, "id" | "created_at" | "english_grade"> & { id?: string; english_grade?: EnglishGrade | null };
        Update: Partial<Omit<Student, "id" | "created_at">>;
        Relationships: [];
      };
      universities: {
        Row: University;
        Insert: Omit<University, "id" | "created_at" | "photo_path"> & { id?: string; photo_path?: string | null };
        Update: Partial<Omit<University, "id" | "created_at">>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Course, "id" | "created_at">>;
        Relationships: [];
      };
      intakes: {
        Row: Intake;
        Insert: Omit<Intake, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Intake, "id" | "created_at">>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Application, "id" | "created_at">>;
        Relationships: [];
      };
      custom_catalog_presets: {
        Row: CustomCatalogPreset;
        Insert: Omit<CustomCatalogPreset, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<CustomCatalogPreset, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
