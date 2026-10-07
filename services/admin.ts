import "server-only";
import { requireUser } from "./auth";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type ManagedTable = "subjects" | "teachers" | "courses" | "chapters" | "lessons" | "materials" | "student_subject_access" | "student_teacher_access" | "menus";
type Mutation<Operation extends "Insert" | "Update"> = {
  [T in ManagedTable]: { table: T; values: Tables[T][Operation] }
}[ManagedTable];

// These are server utilities, not unauthenticated HTTP endpoints.
// Explicit branches retain the table/row relationship in Supabase's strict types.
export async function createRecord(input: Mutation<"Insert">) {
  const { client } = await requireUser("ADMIN");
  const result = await (async () => {
    switch (input.table) {
      case "subjects": return client.from("subjects").insert(input.values).select().single();
      case "teachers": return client.from("teachers").insert(input.values).select().single();
      case "courses": return client.from("courses").insert(input.values).select().single();
      case "chapters": return client.from("chapters").insert(input.values).select().single();
      case "lessons": return client.from("lessons").insert(input.values).select().single();
      case "materials": return client.from("materials").insert(input.values).select().single();
      case "student_subject_access": return client.from("student_subject_access").insert(input.values).select().single();
      case "student_teacher_access": return client.from("student_teacher_access").insert(input.values).select().single();
      case "menus": return client.from("menus").insert(input.values).select().single();
    }
  })();
  if (result.error) throw result.error;
  return result.data;
}
export async function updateRecord(id: string, input: Mutation<"Update">) {
  const { client } = await requireUser("ADMIN");
  const result = await (async () => {
    switch (input.table) {
      case "subjects": return client.from("subjects").update(input.values).eq("id", id).select().single();
      case "teachers": return client.from("teachers").update(input.values).eq("id", id).select().single();
      case "courses": return client.from("courses").update(input.values).eq("id", id).select().single();
      case "chapters": return client.from("chapters").update(input.values).eq("id", id).select().single();
      case "lessons": return client.from("lessons").update(input.values).eq("id", id).select().single();
      case "materials": return client.from("materials").update(input.values).eq("id", id).select().single();
      case "student_subject_access": return client.from("student_subject_access").update(input.values).eq("id", id).select().single();
      case "student_teacher_access": return client.from("student_teacher_access").update(input.values).eq("id", id).select().single();
      case "menus": return client.from("menus").update(input.values).eq("id", id).select().single();
    }
  })();
  if (result.error) throw result.error;
  return result.data;
}
