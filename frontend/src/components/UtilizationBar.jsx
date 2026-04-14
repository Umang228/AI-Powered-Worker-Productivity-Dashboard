export default function UtilizationBar({ value, height = 'h-2' }) {
  const clamp = Math.min(100, Math.max(0, value));
  let barColor = 'bg-emerald-500';
  if (clamp < 50) barColor = 'bg-rose-500';
  else if (clamp < 70) barColor = 'bg-amber-500';

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`flex-1 ${height} bg-slate-100 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${clamp}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-12 text-right">{clamp.toFixed(1)}%</span>
    </div>
  );
}
