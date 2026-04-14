import UtilizationBar from './UtilizationBar';
import { ChevronRight } from 'lucide-react';

export default function WorkerTable({ workers, onSelect }) {
  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Worker Metrics</h2>
      <p className="text-sm text-slate-400 mb-6">Individual productivity metrics for all workers</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {workers.map((w) => (
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
                  <p className="text-xs text-slate-400">{w.worker_id}</p>
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
                <div>
                  <p className="text-xs text-slate-400">Active</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtHours(w.total_active_minutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Idle</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtHours(w.total_idle_minutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Units Produced</p>
                  <p className="text-sm font-semibold text-slate-700">{w.total_units_produced}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Units / Hour</p>
                  <p className="text-sm font-semibold text-slate-700">{w.units_per_hour.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
