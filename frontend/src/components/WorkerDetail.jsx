import MetricCard from './MetricCard';
import UtilizationBar from './UtilizationBar';
import { Clock, Package, TrendingUp, TrendingDown, Minus, Percent, Coffee, UserX, ShieldCheck, CalendarDays, Activity, Sun, Moon, ArrowUp, ArrowDown, Star } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

const DEPT_COLORS = {
  Assembly: 'bg-blue-100 text-blue-700',
  Welding: 'bg-amber-100 text-amber-700',
  Packaging: 'bg-purple-100 text-purple-700',
};

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

  const dailyData = (worker.daily_breakdown || []).map((d) => ({
    date: d.date.slice(5),
    active: d.active_minutes,
    idle: d.idle_minutes,
    absent: d.absent_minutes,
    units: d.units_produced,
    utilization: d.active_minutes + d.idle_minutes + d.absent_minutes > 0
      ? (d.active_minutes / (d.active_minutes + d.idle_minutes + d.absent_minutes) * 100)
      : 0,
  }));

  const totalMin = worker.total_active_minutes + worker.total_idle_minutes + worker.total_absent_minutes;
  const numDays = (worker.daily_breakdown || []).length || 1;

  const trendSlope = worker.trend_slope || 0;
  const TrendIcon = trendSlope > 0.5 ? TrendingUp : trendSlope < -0.5 ? TrendingDown : Minus;
  const trendLabel = trendSlope > 0.5 ? 'Improving' : trendSlope < -0.5 ? 'Declining' : 'Stable';
  const trendColor = trendSlope > 0.5 ? 'green' : trendSlope < -0.5 ? 'rose' : 'slate';

  const bestDay = dailyData.length > 0
    ? dailyData.reduce((best, d) => d.utilization > best.utilization ? d : best, dailyData[0])
    : null;
  const worstDay = dailyData.length > 0
    ? dailyData.reduce((worst, d) => d.utilization < worst.utilization ? d : worst, dailyData[0])
    : null;

  const amPmDiff = (worker.am_utilization || 0) - (worker.pm_utilization || 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
          {worker.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{worker.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-400">{worker.worker_id}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DEPT_COLORS[worker.department] || 'bg-slate-100 text-slate-600'}`}>
              {worker.department}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendColor === 'green' ? 'bg-emerald-100 text-emerald-700'
              : trendColor === 'rose' ? 'bg-rose-100 text-rose-700'
              : 'bg-slate-100 text-slate-600'
            }`}>
              <TrendIcon className="w-3 h-3" />
              {trendLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Active / Day" value={fmtHours(worker.total_active_minutes / numDays)} sub={`${(worker.total_active_minutes / totalMin * 100).toFixed(1)}% of total time`} icon={Clock} color="blue" />
        <MetricCard label="Idle / Day" value={fmtHours(worker.total_idle_minutes / numDays)} sub={`${(worker.total_idle_minutes / totalMin * 100).toFixed(1)}% of total time`} icon={Coffee} color="amber" />
        <MetricCard label="Absent / Day" value={fmtHours(worker.total_absent_minutes / numDays)} sub={`${(worker.total_absent_minutes / totalMin * 100).toFixed(1)}% of total time`} icon={UserX} color="rose" />
        <MetricCard label="Utilization" value={`${worker.utilization_pct}%`} sub="active / total tracked time" icon={Percent} color="green" />
        <MetricCard label="Units Produced" value={worker.total_units_produced} sub={`~${(worker.total_units_produced / numDays).toFixed(0)} / day`} icon={Package} color="purple" />
        <MetricCard label="Units / Hour" value={worker.units_per_hour.toFixed(2)} sub="per active hour" icon={TrendingUp} color="indigo" />
        <MetricCard label="Consistency" value={`${(worker.consistency_score ?? 0).toFixed(0)}`} sub="0-100, higher = steadier" icon={Activity} color="cyan" />
        <MetricCard label="Production Trend" value={`${trendSlope > 0 ? '+' : ''}${trendSlope.toFixed(1)} u/day`} sub={trendLabel} icon={TrendIcon} color={trendColor} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">AM Utilization</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{(worker.am_utilization ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Hours 8-12</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-600">PM Utilization</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{(worker.pm_utilization ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Hours 13-16</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            {amPmDiff > 5 ? <ArrowDown className="w-4 h-4 text-amber-500" /> : amPmDiff < -5 ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
            <span className="text-xs font-semibold text-slate-600">AM vs PM</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{Math.abs(amPmDiff).toFixed(1)}pp</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {amPmDiff > 5 ? 'Afternoon fatigue detected' : amPmDiff < -5 ? 'Morning ramp-up pattern' : 'Balanced throughout day'}
          </p>
        </div>
      </div>

      {bestDay && worstDay && dailyData.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Best Day: {bestDay.date}</p>
              <p className="text-xs text-emerald-600">{bestDay.utilization.toFixed(1)}% utilization &middot; {bestDay.units} units</p>
            </div>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Worst Day: {worstDay.date}</p>
              <p className="text-xs text-rose-600">{worstDay.utilization.toFixed(1)}% utilization &middot; {worstDay.units} units</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Utilization</p>
        <UtilizationBar value={worker.utilization_pct} height="h-3" />
      </div>

      {dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Utilization Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [`${v.toFixed(1)}%`]}
                />
                <Line type="monotone" dataKey="utilization" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} name="Utilization" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Units Produced</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [`${v} units`]}
                />
                <Bar dataKey="units" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v) => `${v.toFixed(0)} min`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {dailyData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Activity Stacked</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Min', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => `${v.toFixed(0)} min`}
                />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Active" />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Idle" />
                <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" name="Absent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
