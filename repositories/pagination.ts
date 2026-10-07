// Range requests avoid silently truncating catalog/progress at Supabase's row cap.
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await page(from, from + 499);
    if (result.error) throw new Error("Không thể tải dữ liệu.");
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
