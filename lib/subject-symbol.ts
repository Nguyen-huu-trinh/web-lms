export function subjectSymbol(name: string): string {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/toan/.test(normalized)) return "📐";
  if (/vat ly|^li$|^ly$/.test(normalized)) return "⚡";
  if (/hoa/.test(normalized)) return "🧪";
  if (/sinh/.test(normalized)) return "🧬";
  if (/anh/.test(normalized)) return "📘";
  if (/van/.test(normalized)) return "📖";
  if (/su/.test(normalized)) return "📜";
  if (/dia/.test(normalized)) return "🌍";
  return "📚";
}
