import MetricCard from './MetricCard';
import UtilizationBar from './UtilizationBar';
import { Clock, Package, TrendingUp, Percent, Coffee, UserX } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

export default function WorkerDetail({ worker }) {
  if (!worker) return null;

  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const pieData = [
    { name: 'Active', value: worker.total_active_minutes },
    { name: 'Idle', value: worker.total_idle_minutes },
    { name: 'Absent', value: worker.total_absent_minutes },
  ];

  const barData = [
    { name: 'Active', minutes: worker.total_active_minutes, fill: '#3b82f6' },
    { name: 'Idle', minutes: worker.total_idle_minutes, fill: '#f59e0b' },
    { name: 'Absent', minutes: worker.total_absent_minutes, fill: '#ef4444' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
          {worker.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{worker.name}</h2>
          <p className="text-sm text-slate-400">{worker.worker_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Active Time" value={fmtHours(worker.total_active_minutes)} icon={Clock} color="blue" />
        <MetricCard label="Idle Time" value={fmtHours(worker.total_idle_minutes)} icon={Coffee} color="amber" />
        <MetricCard label="Absent Time" value={fmtHours(worker.total_absent_minutes)} icon={UserX} color="rose" />
        <MetricCard label="Utilization" value={`${worker.utilization_pct}%`} icon={Percent} color="green" />
        <MetricCard label="Units Produced" value={worker.total_units_produced} icon={Package} color="purple" />
        <MetricCard label="Units / Hour" value={worker.units_per_hour.toFixed(2)} icon={TrendingUp} color="indigo" />
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Utilization</p>
        <UtilizationBar value={worker.utilization_pct} height="h-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Time Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v.toFixed(0)} min`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Time Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
              <Tooltip formatter={(v) => `${v.toFixed(0)} min`} />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
