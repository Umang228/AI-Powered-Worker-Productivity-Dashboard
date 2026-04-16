import MetricCard from './MetricCard';
import {
  Clock, Package, TrendingUp, TrendingDown, Minus, Percent, Users, Monitor,
  Coffee, UserX, ShieldCheck, CalendarDays,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const DEPT_COLORS = {
  Assembly: '#3b82f6',
  Welding: '#f59e0b',
  Packaging: '#8b5cf6',
};

export default function FactorySummary({ factory, workers }) {
  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const numWorkers = factory.total_workers || 1;
  const numDays = factory.num_days || 1;

  const avgActivePerWorkerDay = factory.total_productive_minutes / numWorkers / numDays;
  const avgIdlePerWorkerDay = factory.total_idle_minutes / numWorkers / numDays;
  const avgAbsentPerWorkerDay = factory.total_absent_minutes / numWorkers / numDays;
  const avgUnitsPerWorkerDay = factory.total_production_count / numWorkers / numDays;

  const deptPieData = factory.departments.map((d) => ({
    name: d.department,
    value: d.total_units_produced,
  }));

  const deptBarData = factory.departments.map((d) => ({
    name: d.department,
    utilization: d.avg_utilization,
    unitsPerHour: d.avg_units_per_hour,
  }));

  const hourlyData = factory.hourly_breakdown.map((h) => ({
    hour: `${h.hour}:00`,
    active: Math.round(h.active_minutes / numWorkers / numDays),
    idle: Math.round(h.idle_minutes / numWorkers / numDays),
    units: h.units_produced,
  }));

  const sortedWorkers = workers ? [...workers].sort((a, b) => b.utilization_pct - a.utilization_pct) : [];

  const avgTrendSlope = workers && workers.length > 0
    ? workers.reduce((s, w) => s + (w.trend_slope || 0), 0) / workers.length
    : 0;
  const FactoryTrendIcon = avgTrendSlope > 0.5 ? TrendingUp : avgTrendSlope < -0.5 ? TrendingDown : Minus;
  const factoryTrendLabel = avgTrendSlope > 0.5 ? 'Improving' : avgTrendSlope < -0.5 ? 'Declining' : 'Stable';
  const factoryTrendColor = avgTrendSlope > 0.5 ? 'green' : avgTrendSlope < -0.5 ? 'rose' : 'slate';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Factory Overview</h2>
          <p className="text-sm text-slate-400">
            {numWorkers} workers &middot; {factory.total_workstations} workstations &middot; {numDays} days tracked
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
          factoryTrendColor === 'green' ? 'bg-emerald-100 text-emerald-700'
          : factoryTrendColor === 'rose' ? 'bg-rose-100 text-rose-700'
          : 'bg-slate-100 text-slate-600'
        }`}>
          <FactoryTrendIcon className="w-4 h-4" />
          Production {factoryTrendLabel}
          <span className="text-xs font-normal opacity-75">({avgTrendSlope > 0 ? '+' : ''}{avgTrendSlope.toFixed(1)} u/day avg)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Active / Worker / Day"
          value={fmtHours(avgActivePerWorkerDay)}
          sub={`${fmtHours(factory.total_productive_minutes)} total across all workers`}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          label="Total Production"
          value={factory.total_production_count.toLocaleString()}
          sub={`~${avgUnitsPerWorkerDay.toFixed(1)} units / worker / day`}
          icon={Package}
          color="green"
        />
        <MetricCard
          label="Avg Production Rate"
          value={`${factory.avg_production_rate.toFixed(1)}`}
          sub="units per active hour"
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          label="Avg Utilization"
          value={`${factory.avg_utilization.toFixed(1)}%`}
          sub="across all workers"
          icon={Percent}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Idle / Worker / Day"
          value={fmtHours(avgIdlePerWorkerDay)}
          sub={`${fmtHours(factory.total_idle_minutes)} total`}
          icon={Coffee}
          color="amber"
        />
        <MetricCard
          label="Avg Absent / Worker / Day"
          value={fmtHours(avgAbsentPerWorkerDay)}
          sub={`${fmtHours(factory.total_absent_minutes)} total`}
          icon={UserX}
          color="rose"
        />
        <MetricCard
          label="AI Confidence"
          value={`${(factory.avg_confidence * 100).toFixed(1)}%`}
          sub="avg detection confidence"
          icon={ShieldCheck}
          color="cyan"
        />
        <MetricCard
          label="Days Tracked"
          value={numDays}
          sub={`${numWorkers} workers, ${factory.total_workstations} stations`}
          icon={CalendarDays}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Hourly Production Activity</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Min / Worker', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v, name) => [`${v} min`, name === 'active' ? 'Active' : 'Idle']}
              />
              <Area type="monotone" dataKey="active" stroke="#3b82f6" fill="url(#activeGrad)" strokeWidth={2} name="active" />
              <Area type="monotone" dataKey="idle" stroke="#f59e0b" fill="url(#idleGrad)" strokeWidth={2} name="idle" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Production by Department</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={deptPieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {deptPieData.map((entry) => (
                  <Cell key={entry.name} fill={DEPT_COLORS[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v) => [`${v} units`]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Department Utilization Comparison</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={85} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v) => [`${v.toFixed(1)}%`]}
              />
              <Bar dataKey="utilization" radius={[0, 6, 6, 0]} name="Utilization">
                {deptBarData.map((entry) => (
                  <Cell key={entry.name} fill={DEPT_COLORS[entry.name] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Worker Utilization Ranking</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {sortedWorkers.map((w, i) => {
              const barColor = w.utilization_pct >= 70 ? 'bg-emerald-500' : w.utilization_pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={w.worker_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {w.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-slate-700 truncate">{w.name}</span>
                      <span className="text-xs font-semibold text-slate-500 ml-2">{w.utilization_pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, w.utilization_pct)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {factory.departments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Department Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {factory.departments.map((d) => (
              <div key={d.department} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS[d.department] || '#64748b' }}
                  />
                  <span className="font-semibold text-slate-800">{d.department}</span>
                  <span className="text-xs text-slate-400 ml-auto">{d.worker_count} workers</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Avg Utilization</p>
                    <p className="font-semibold text-slate-700">{d.avg_utilization.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Avg Units / Hour</p>
                    <p className="font-semibold text-slate-700">{d.avg_units_per_hour.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Units Produced</p>
                    <p className="font-semibold text-slate-700">{d.total_units_produced.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Active / Worker / Day</p>
                    <p className="font-semibold text-slate-700">{fmtHours(d.total_active_minutes / d.worker_count / numDays)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
