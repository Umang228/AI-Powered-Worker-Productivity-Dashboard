import { useState, useMemo } from 'react';
import UtilizationBar from './UtilizationBar';
import { ChevronRight, ArrowUpDown, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TYPE_GRADIENT = {
  Assembly: 'from-emerald-500 to-teal-600',
  Welding: 'from-amber-500 to-orange-600',
  Packaging: 'from-purple-500 to-violet-600',
};

const TYPE_BADGE = {
  Assembly: 'bg-emerald-100 text-emerald-700',
  Welding: 'bg-amber-100 text-amber-700',
  Packaging: 'bg-purple-100 text-purple-700',
};

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'utilization_pct', label: 'Utilization' },
  { key: 'total_units_produced', label: 'Units' },
  { key: 'throughput_rate', label: 'Throughput' },
];

export default function WorkstationTable({ stations, onSelect }) {
  const [sortBy, setSortBy] = useState('utilization_pct');
  const [sortAsc, setSortAsc] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(
    () => [...new Set(stations.map((s) => s.station_type))].sort(),
    [stations],
  );

  const sorted = useMemo(() => {
    let filtered = typeFilter === 'all' ? stations : stations.filter((s) => s.station_type === typeFilter);
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [stations, sortBy, sortAsc, typeFilter]);

  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const handleSort = (key) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Workstation Metrics</h2>
      <p className="text-sm text-slate-400 mb-4">Performance metrics per workstation</p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Type:</span>
        </div>
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            typeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({stations.length})
        </button>
        {types.map((t) => {
          const count = stations.filter((s) => s.station_type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t} ({count})
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="font-medium">Sort:</span>
        </div>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleSort(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sortBy === opt.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label} {sortBy === opt.key && (sortAsc ? '\u2191' : '\u2193')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((s) => (
          <div
            key={s.station_id}
            onClick={() => onSelect(s.station_id)}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${TYPE_GRADIENT[s.station_type] || 'from-slate-500 to-slate-600'} flex items-center justify-center text-white font-bold text-xs`}>
                  {s.station_id}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{s.station_id}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[s.station_type] || 'bg-slate-100 text-slate-600'}`}>
                      {s.station_type}
                    </span>
                    {(() => {
                      const t = s.trend_slope || 0;
                      const Icon = t > 0.5 ? TrendingUp : t < -0.5 ? TrendingDown : Minus;
                      const cls = t > 0.5 ? 'text-emerald-600' : t < -0.5 ? 'text-rose-600' : 'text-slate-400';
                      return <Icon className={`w-3 h-3 ${cls}`} />;
                    })()}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Utilization</span>
                </div>
                <UtilizationBar value={s.utilization_pct} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                {(() => {
                  const days = (s.daily_breakdown || []).length || 1;
                  return (
                    <>
                      <div>
                        <p className="text-xs text-slate-400">Working / Day</p>
                        <p className="text-sm font-semibold text-slate-700">{fmtHours(s.working_minutes / days)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Units Produced</p>
                        <p className="text-sm font-semibold text-slate-700">{s.total_units_produced}</p>
                      </div>
                    </>
                  );
                })()}
                <div>
                  <p className="text-xs text-slate-400">Throughput</p>
                  <p className="text-sm font-semibold text-slate-700">{s.throughput_rate.toFixed(1)} u/hr</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Downtime / Day</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtHours((s.daily_breakdown || []).reduce((acc, d) => acc + d.absent_minutes, 0) / ((s.daily_breakdown || []).length || 1))}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
