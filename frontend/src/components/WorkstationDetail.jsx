import MetricCard from './MetricCard';
import UtilizationBar from './UtilizationBar';
import { Clock, Package, TrendingUp, Percent } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

export default function WorkstationDetail({ station }) {
  if (!station) return null;

  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const barData = [
    { name: 'Occupancy', value: station.occupancy_minutes, fill: '#3b82f6' },
    { name: 'Units', value: station.total_units_produced, fill: '#10b981' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
          {station.station_id}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{station.name}</h2>
          <p className="text-sm text-slate-400">{station.station_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Occupancy" value={fmtHours(station.occupancy_minutes)} icon={Clock} color="blue" />
        <MetricCard label="Utilization" value={`${station.utilization_pct}%`} icon={Percent} color="green" />
        <MetricCard label="Units Produced" value={station.total_units_produced} icon={Package} color="purple" />
        <MetricCard label="Throughput" value={`${station.throughput_rate.toFixed(2)}/hr`} icon={TrendingUp} color="amber" />
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Utilization</p>
        <UtilizationBar value={station.utilization_pct} height="h-3" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Station Metrics</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
