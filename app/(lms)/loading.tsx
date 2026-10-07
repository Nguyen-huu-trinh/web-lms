export default function Loading() {
  return <div className="surface loading-state" role="status" aria-live="polite" aria-busy="true"><p>Đang tải nội dung học tập…</p><div aria-hidden="true"><div className="skeleton w-1/3" /><div className="skeleton w-2/3" /><div className="skeleton large" /></div></div>;
}
