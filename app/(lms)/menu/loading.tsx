export default function LoadingPricing() {
  return <main className="space-y-6" role="status" aria-busy="true" aria-label="Đang tải bảng giá"><span className="sr-only">Đang tải bảng giá…</span><div className="surface p-6" aria-hidden="true"><div className="skeleton w-1/3" /><div className="skeleton w-2/3" /></div><div className="grid gap-4 md:grid-cols-2" aria-hidden="true">{[0,1,2,3].map((id) => <div key={id} className="surface p-6"><div className="skeleton w-2/3" /><div className="skeleton large" /></div>)}</div></main>;
}
