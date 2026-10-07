export const entityNames = {
  subjects: "môn học", teachers: "giáo viên", courses: "khóa học",
  chapters: "chương", lessons: "bài học", materials: "tài liệu", menus: "mục giá",
} as const;
export type Entity = keyof typeof entityNames;
export type MutationContext = { entity: Entity; id?: string; parentId?: string };
export type MutationResult = { error: string; success: string; redirectTo?: string };
export class InputError extends Error {}
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validateContext(value: MutationContext) {
  if (!value || !Object.hasOwn(entityNames, value.entity)) throw new InputError("Loại dữ liệu không hợp lệ.");
  if (value.id !== undefined && !validId(value.id)) throw new InputError("Dữ liệu không hợp lệ.");
  if (!["subjects", "menus"].includes(value.entity) && !validId(value.parentId)) throw new InputError("Không xác định được nội dung cha.");
}
function text(form: FormData, key: string, required = true, max = 200) {
  const raw = form.get(key);
  if (raw !== null && typeof raw !== "string") throw new InputError("Dữ liệu nhập không hợp lệ.");
  const value = (raw ?? "").trim();
  if (required && !value) throw new InputError("Vui lòng nhập đầy đủ tên/tiêu đề.");
  if (value.length > max) throw new InputError(`Nội dung vượt quá ${max} ký tự.`);
  return value;
}
function order(form: FormData) {
  const raw = text(form, "order_index", false);
  if (!/^\d+$/.test(raw) || Number(raw) > 2147483647) throw new InputError("Thứ tự phải là số nguyên từ 0 đến 2147483647.");
  return Number(raw);
}
export function parseRecord(entity: Entity, form: FormData) {
  // Omitted on existing edit forms: preserve the stored order. Inserts default to 0 in SQL.
  const catalogOrder = ["subjects", "teachers", "courses", "menus"].includes(entity) && form.has("order_index")
    ? { order_index: order(form) } : {};
  switch (entity) {
    case "subjects": return { entity, values: { ...catalogOrder, name: text(form,"name"), description: text(form,"description",false,5000) || null } };
    case "teachers": return { entity, values: { ...catalogOrder, name: text(form,"name"), bio: text(form,"bio",false,5000) || null } };
    case "courses": return { entity, values: { ...catalogOrder, title: text(form,"title"), description: text(form,"description",false,5000) || null } };
    case "chapters": case "lessons": return { entity, values: { title: text(form,"title"), order_index: order(form) } };
    case "materials": {
      const type = text(form,"type"), provider = text(form,"provider"), url = text(form,"url",false,2048);
      if ((type !== "pdf" && type !== "video") || (provider !== "drive" && provider !== "youtube") || (type === "pdf" && provider !== "drive")) throw new InputError("PDF chỉ dùng Google Drive; video dùng Google Drive hoặc YouTube.");
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new InputError("URL không hợp lệ."); }
      const hosts = provider === "drive" ? ["drive.google.com"] : ["youtube.com","www.youtube.com","youtu.be"];
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !hosts.includes(parsed.hostname)) throw new InputError("URL phải dùng HTTPS và đúng nguồn đã chọn.");
      return { entity, values: { title: text(form,"title"), type: type as "pdf" | "video", provider: provider as "drive" | "youtube", url: parsed.href, order_index: order(form) } };
    }
    case "menus": {
      const raw = text(form,"price",false);
      if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) > 9999999999.99) throw new InputError("Giá phải là số không âm, tối đa 9999999999.99 và 2 chữ số thập phân.");
      return { entity, values: { ...catalogOrder, name: text(form,"name"), price: Number(raw) } };
    }
  }
}
