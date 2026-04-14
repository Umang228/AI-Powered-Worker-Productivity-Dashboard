import UtilizationBar from './UtilizationBar';
import { ChevronRight } from 'lucide-react';

export default function WorkstationTable({ stations, onSelect }) {
  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const typeColors = {
    Assembly: 'from-emerald-500 to-teal-600',
    Welding: 'from-amber-500 to-orange-600',
    Packaging: 'from-purple-500 to-violet-600',
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Workstation Metrics</h2>
      <p className="text-sm text-slate-400 mb-6">Performance metrics per workstation</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stations.map((s) => (
          <div
            key={s.station_id}
            onClick={() => onSelect(s.station_id)}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${typeColors[s.name.split(' ')[0]] || 'from-slate-500 to-slate-600'} flex items-center justify-center text-white font-bold text-xs`}>
                  {s.station_id}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.station_id}</p>
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
                <div>
                  <p className="text-xs text-slate-400">Occupancy</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtHours(s.occupancy_minutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Units Produced</p>
                  <p className="text-sm font-semibold text-slate-700">{s.total_units_produced}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Throughput Rate</p>
                  <p className="text-sm font-semibold text-slate-700">{s.throughput_rate.toFixed(2)} units/hr</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
