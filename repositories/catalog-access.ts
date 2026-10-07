import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AccessRow } from "@/types/admin";
import { allRows } from "./pagination";

// Only load access for the visible subject. Batch IDs to keep request URLs bounded.
async function batches<T>(ids: string[], fetch: (ids: string[]) => Promise<T[]>) {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 100) rows.push(...await fetch(ids.slice(i, i + 100)));
  return rows;
}

export async function catalogAccess(client: SupabaseClient<Database>, subjectId: string, teacherIds: string[]) {
  const [subjectAccess, teacherAccess] = await Promise.all([
    allRows((a, b) => client.from("student_subject_access").select("id,student_id,created_at").eq("subject_id", subjectId).order("id").range(a, b)),
    batches(teacherIds, (ids) => allRows((a, b) => client.from("student_teacher_access").select("id,student_id,teacher_id,created_at").in("teacher_id", ids).order("id").range(a, b))),
  ]);
  const studentIds = [...new Set([...subjectAccess, ...teacherAccess].map((row) => row.student_id))];
  const students = await batches(studentIds, (ids) => allRows((a, b) => client.from("profiles").select("id,email,username").eq("role", "STUDENT").in("id", ids).order("id").range(a, b)));
  const emails = new Map(students.map((student) => [student.id, student.username ?? student.email]));
  const accessRow = (row: { id: string; student_id: string; created_at: string }): AccessRow => ({
    id: row.id, created_at: row.created_at, email: emails.get(row.student_id) ?? "Học sinh",
  });
  const teachers = new Map<string, AccessRow[]>();
  for (const row of teacherAccess) {
    const rows = teachers.get(row.teacher_id) ?? [];
    rows.push(accessRow(row));
    teachers.set(row.teacher_id, rows);
  }
  return { subject: subjectAccess.map(accessRow), teachers };
}
