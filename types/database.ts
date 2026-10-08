export type Role = "ADMIN" | "STUDENT";
type Base = { id: string; created_at: string };
export type Profile = Base & { trial_expires_at: string | null; email: string; username: string | null; role: Role; must_change_password: boolean; provisioned_by_admin: boolean };
export type Subject = Base & { order_index: number; name: string; description: string | null };
export type Teacher = Base & { order_index: number; subject_id: string; name: string; bio: string | null };
export type Course = Base & { order_index: number; teacher_id: string; title: string; description: string | null };
export type Chapter = Base & { course_id: string; title: string; order_index: number };
export type Lesson = Base & { chapter_id: string; title: string; order_index: number };
export type Material = Base & { lesson_id: string; title: string; order_index: number; url: string } &
  ({ type: "pdf"; provider: "drive" } | { type: "video"; provider: "drive" | "youtube" });
// Database columns are represented separately; SQL enforces their combined constraint.
type MaterialRow = Base & { lesson_id: string; title: string; order_index: number; url: string; type: "pdf" | "video"; provider: "drive" | "youtube" };
export type SubjectAccess = Base & { student_id: string; subject_id: string };
export type TeacherAccess = Base & { student_id: string; teacher_id: string };
export type Progress = { id: string; student_id: string; lesson_id: string; is_completed: boolean; updated_at: string };
export type Menu = Base & { order_index: number; name: string; price: number };
export type ActiveSession = { id: string; user_id: string; session_id: string; updated_at: string };
type ProfileRelationship<Name extends string> = [{ foreignKeyName: Name; columns: ["student_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
type Table<Row, Required extends keyof Row, Relationships = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: Relationships;
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id" | "email">;
      subjects: Table<Subject, "name">;
      teachers: Table<Teacher, "subject_id" | "name">;
      courses: Table<Course, "teacher_id" | "title">;
      chapters: Table<Chapter, "course_id" | "title" | "order_index">;
      lessons: Table<Lesson, "chapter_id" | "title" | "order_index">;
      materials: Table<MaterialRow, "lesson_id" | "title" | "type" | "provider" | "url" | "order_index">;
      student_subject_access: Table<SubjectAccess, "student_id" | "subject_id", ProfileRelationship<"student_subject_access_student_id_fkey">>;
      student_teacher_access: Table<TeacherAccess, "student_id" | "teacher_id", ProfileRelationship<"student_teacher_access_student_id_fkey">>;
      user_progress: Table<Progress, "student_id" | "lesson_id">;
      menus: Table<Menu, "name" | "price">;
      active_sessions: Table<ActiveSession, "user_id" | "session_id">;
    };
    Views: { [_ in never]: never };
    Functions: {
      trial_cleanup_enabled: { Args: Record<string, never>; Returns: boolean };
      session_is_active: { Args: Record<string, never>; Returns: boolean };
      end_session: { Args: Record<string, never>; Returns: undefined };
      find_student_account: { Args: { account_email: string }; Returns: { id: string; profile_id: string | null; role: Role | null; has_password: boolean; auth_exists: boolean }[] };
      grant_student_username_access_batch: { Args: { actor_id: string; actor_session: string; student: string; target_kind: string; target_ids: string[]; student_username: string }; Returns: undefined };
      grant_student_username_access: { Args: { actor_id: string; actor_session: string; student: string; target_kind: string; target_id: string; student_username: string }; Returns: undefined };
      grant_student_access: { Args: { actor_id: string; actor_session: string; student: string; target_kind: string; target_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
