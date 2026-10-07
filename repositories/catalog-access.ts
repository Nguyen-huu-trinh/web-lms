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

// Initial catalog needs counts, not student identities or complete membership records.
export async function catalogAccessCounts(client: SupabaseClient<Database>, subjectId: string, teacherIds: string[]) {
  const [subject, teachers] = await Promise.all([
    client.from("student_subject_access").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    batches(teacherIds, (ids) => allRows((a, b) => client.from("student_teacher_access").select("teacher_id").in("teacher_id", ids).order("id").range(a, b))),
  ]);
  if (subject.error) throw new Error("Không thể tải số lượng học sinh.");
  const counts = new Map<string, number>();
  for (const row of teachers) counts.set(row.teacher_id, (counts.get(row.teacher_id) ?? 0) + 1);
  return { subject: subject.count ?? 0, teachers: counts };
}

export async function studentAccessList(client: SupabaseClient<Database>, kind: "subject" | "teacher", targetId: string, page = 0, search = "") {
  const pageSize = 50;
  const fields = "id,created_at,student:profiles!student_id!inner(username,email)";
  let query = (kind === "subject"
    ? client.from("student_subject_access").select(fields, { count: "exact" }).eq("subject_id", targetId)
    : client.from("student_teacher_access").select(fields, { count: "exact" }).eq("teacher_id", targetId))
    .eq("student.role", "STUDENT").order("id");
  if (search.trim()) {
    // Quote the PostgREST literal and escape LIKE wildcards to keep search literal.
    const pattern = "%" + search.trim().replace(/[\\%_*]/g, (char) => "\\" + char) + "%";
    const literal = JSON.stringify(pattern);
    query = query.or("username.ilike." + literal + ",email.ilike." + literal, { referencedTable: "student" });
  }
  const { data, count, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error("Không thể tải danh sách học sinh.");
  return {
    rows: (data ?? []).map((row): AccessRow => ({ id: row.id, created_at: row.created_at, email: row.student.username ?? row.student.email })),
    total: count ?? 0,
    pageSize,
  };
}
