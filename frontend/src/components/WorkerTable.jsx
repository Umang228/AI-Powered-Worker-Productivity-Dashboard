import { useState, useMemo } from 'react';
import UtilizationBar from './UtilizationBar';
import { ChevronRight, ArrowUpDown, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DEPT_COLORS = {
  Assembly: 'bg-blue-100 text-blue-700',
  Welding: 'bg-amber-100 text-amber-700',
  Packaging: 'bg-purple-100 text-purple-700',
};

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'utilization_pct', label: 'Utilization' },
  { key: 'total_units_produced', label: 'Units Produced' },
  { key: 'units_per_hour', label: 'Units/Hour' },
];

export default function WorkerTable({ workers, onSelect }) {
  const [sortBy, setSortBy] = useState('utilization_pct');
  const [sortAsc, setSortAsc] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');

  const departments = useMemo(
    () => [...new Set(workers.map((w) => w.department))].sort(),
    [workers],
  );

  const sorted = useMemo(() => {
    let filtered = deptFilter === 'all' ? workers : workers.filter((w) => w.department === deptFilter);
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [workers, sortBy, sortAsc, deptFilter]);

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
      <h2 className="text-xl font-bold text-slate-900 mb-1">Worker Metrics</h2>
      <p className="text-sm text-slate-400 mb-4">Individual productivity metrics for all workers</p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Department:</span>
        </div>
        <button
          onClick={() => setDeptFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            deptFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({workers.length})
        </button>
        {departments.map((d) => {
          const count = workers.filter((w) => w.department === d).length;
          return (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                deptFilter === d ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} ({count})
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
        {sorted.map((w) => (
          <div
            key={w.worker_id}
            onClick={() => onSelect(w.worker_id)}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {w.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{w.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{w.worker_id}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DEPT_COLORS[w.department] || 'bg-slate-100 text-slate-600'}`}>
                      {w.department}
                    </span>
                    {(() => {
                      const t = w.trend_slope || 0;
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
                <UtilizationBar value={w.utilization_pct} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                {(() => {
                  const days = (w.daily_breakdown || []).length || 1;
                  return (
                    <>
                      <div>
                        <p className="text-xs text-slate-400">Active / Day</p>
                        <p className="text-sm font-semibold text-slate-700">{fmtHours(w.total_active_minutes / days)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Idle / Day</p>
                        <p className="text-sm font-semibold text-slate-700">{fmtHours(w.total_idle_minutes / days)}</p>
                      </div>
                    </>
                  );
                })()}
                <div>
                  <p className="text-xs text-slate-400">Units Produced</p>
                  <p className="text-sm font-semibold text-slate-700">{w.total_units_produced}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Consistency</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {(w.consistency_score ?? 0).toFixed(0)}
                    <span className="text-[10px] text-slate-400 ml-0.5">/ 100</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
