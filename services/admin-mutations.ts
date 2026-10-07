import "server-only";
import { requireUser } from "./auth";
import { createRecord, updateRecord } from "./admin";
import { InputError, parseRecord, validateContext, validId, type MutationContext } from "@/lib/admin-validation";

async function checkContext(context: MutationContext) {
  const { client } = await requireUser("ADMIN");
  validateContext(context);
  const { entity, id, parentId } = context;
  const relation = {
    teachers: { table:"subjects", column:"subject_id" }, courses:{ table:"teachers",column:"teacher_id" },
    chapters:{ table:"courses",column:"course_id" }, lessons:{table:"chapters",column:"chapter_id"}, materials:{table:"lessons",column:"lesson_id"},
  } as const;
  if (entity !== "subjects" && entity !== "menus") {
    const parent = relation[entity];
    const { data, error } = await client.from(parent.table).select("id").eq("id",parentId!).maybeSingle();
    if (error || !data) throw new InputError("Nội dung cha không còn tồn tại hoặc bạn không có quyền.");
    if (id) {
      const { data: row, error: rowError } = await client.from(entity).select("id").eq("id",id).filter(parent.column,"eq",parentId!).maybeSingle();
      if (rowError || !row) throw new InputError("Nội dung không thuộc mục đang mở hoặc đã bị xóa.");
    }
  } else if (id) {
    const { data,error } = await client.from(entity).select("id").eq("id",id).maybeSingle();
    if (error || !data) throw new InputError("Dữ liệu không còn tồn tại.");
  }
  return client;
}
export async function mutateRecord(context: MutationContext, form: FormData) {
  await checkContext(context);
  const record = parseRecord(context.entity,form);
  // Only explicitly parsed fields reach the DB; IDs, roles, timestamps and parent
  // reassignment sent inside FormData are ignored. Parent comes from page context.
  if (context.id) {
    switch(record.entity) {
      case "subjects": return updateRecord(context.id,{table:"subjects",values:record.values});
      case "teachers": return updateRecord(context.id,{table:"teachers",values:record.values});
      case "courses": return updateRecord(context.id,{table:"courses",values:record.values});
      case "chapters": return updateRecord(context.id,{table:"chapters",values:record.values});
      case "lessons": return updateRecord(context.id,{table:"lessons",values:record.values});
      case "materials": return updateRecord(context.id,{table:"materials",values:record.values});
      case "menus": return updateRecord(context.id,{table:"menus",values:record.values});
    }
  }
  switch(record.entity) {
    case "subjects": return createRecord({table:"subjects",values:record.values});
    case "teachers": return createRecord({table:"teachers",values:{...record.values,subject_id:context.parentId!}});
    case "courses": return createRecord({table:"courses",values:{...record.values,teacher_id:context.parentId!}});
    case "chapters": return createRecord({table:"chapters",values:{...record.values,course_id:context.parentId!}});
    case "lessons": return createRecord({table:"lessons",values:{...record.values,chapter_id:context.parentId!}});
    case "materials": return createRecord({table:"materials",values:{...record.values,lesson_id:context.parentId!}});
    case "menus": return createRecord({table:"menus",values:record.values});
  }
}
export async function removeRecord(context: MutationContext) {
  const client = await checkContext(context);
  if (!context.id) throw new InputError("Không xác định được dữ liệu cần xóa.");
  let destination = "/courses";
  switch(context.entity) {
    case "teachers": destination = `/courses?subject=${context.parentId}`; break;
    case "courses": destination = `/courses/teachers/${context.parentId}`; break;
    case "chapters": destination = `/courses/${context.parentId}`; break;
    case "lessons": {
      const { data,error } = await client.from("chapters").select("course_id").eq("id",context.parentId!).single();
      if(error) throw error;
      destination = `/courses/${data.course_id}`; break;
    }
    case "materials": destination = `/lessons/${context.parentId}`; break;
    case "menus": destination = "/menu"; break;
  }
  const { data,error } = await client.from(context.entity).delete().eq("id",context.id).select("id");
  if(error) throw error;
  if(!data.length) throw new InputError("Dữ liệu đã bị xóa hoặc bạn không còn quyền.");
  return `${destination}${destination.includes("?") ? "&" : "?"}notice=deleted`;
}
export async function revokeAccess(kind: "subject" | "teacher", targetId: string, accessId: string) {
  const { client } = await requireUser("ADMIN");
  if ((kind !== "subject" && kind !== "teacher") || !validId(targetId) || !validId(accessId)) throw new InputError("Quyền truy cập không hợp lệ.");
  const result = kind === "subject"
    ? await client.from("student_subject_access").delete().eq("id",accessId).eq("subject_id",targetId).select("id")
    : await client.from("student_teacher_access").delete().eq("id",accessId).eq("teacher_id",targetId).select("id");
  if(result.error) throw result.error;
  if(!result.data.length) throw new InputError("Quyền đã được thu hồi hoặc bạn không còn quyền thao tác.");
}
