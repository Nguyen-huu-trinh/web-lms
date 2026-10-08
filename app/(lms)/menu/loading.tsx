export default function LoadingPricing() {
  return (
    <main
      className="max-w-[920px] mx-auto p-4 space-y-4 animate-pulse"
      role="status"
      aria-busy="true"
      aria-label="Đang tải bảng giá"
    >
      <span className="sr-only">Đang tải bảng giá…</span>

      {/* Header Skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-6 w-36 bg-indigo-100 rounded-full" />
        <div className="h-9 w-64 bg-slate-200 rounded-xl" />
        <div className="h-4 w-80 bg-slate-100 rounded-md" />
      </div>

      {/* Panel Skeleton */}
      <div className="bg-white/80 rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="h-6 w-40 bg-slate-200 rounded-lg" />
          <div className="h-6 w-16 bg-slate-100 rounded-md" />
        </div>

        {/* Horizontal Card Skeletons */}
        {[0, 1].map((id) => (
          <div
            key={id}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-slate-200 rounded-md" />
                <div className="h-3 w-20 bg-slate-100 rounded-sm" />
              </div>
            </div>
            <div className="h-7 w-28 bg-emerald-100/60 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  );
}