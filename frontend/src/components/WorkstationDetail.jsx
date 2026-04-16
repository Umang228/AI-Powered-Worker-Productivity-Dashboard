import MetricCard from './MetricCard';
import UtilizationBar from './UtilizationBar';
import { Clock, Package, TrendingUp, TrendingDown, Minus, Percent, ShieldCheck, Wrench, Coffee, BarChart3, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line,
  AreaChart, Area,
} from 'recharts';

const TYPE_BADGE = {
  Assembly: 'bg-emerald-100 text-emerald-700',
  Welding: 'bg-amber-100 text-amber-700',
  Packaging: 'bg-purple-100 text-purple-700',
};

const TYPE_GRADIENT = {
  Assembly: 'from-emerald-500 to-teal-600',
  Welding: 'from-amber-500 to-orange-600',
  Packaging: 'from-purple-500 to-violet-600',
};

const PIE_COLORS = ['#3b82f6', '#f59e0b'];

export default function WorkstationDetail({ station }) {
  if (!station) return null;

  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  const pieData = [
    { name: 'Working', value: station.working_minutes },
    { name: 'Idle', value: station.idle_minutes },
  ];

  const dailyData = (station.daily_breakdown || []).map((d) => ({
    date: d.date.slice(5),
    active: d.active_minutes,
    idle: d.idle_minutes,
    units: d.units_produced,
    utilization: d.active_minutes + d.idle_minutes + d.absent_minutes > 0
      ? (d.active_minutes / (d.active_minutes + d.idle_minutes + d.absent_minutes) * 100)
      : 0,
  }));

  const trendSlope = station.trend_slope || 0;
  const TrendIcon = trendSlope > 0.5 ? TrendingUp : trendSlope < -0.5 ? TrendingDown : Minus;
  const trendLabel = trendSlope > 0.5 ? 'Improving' : trendSlope < -0.5 ? 'Declining' : 'Stable';
  const trendColor = trendSlope > 0.5 ? 'green' : trendSlope < -0.5 ? 'rose' : 'slate';

  const totalDowntime = (station.daily_breakdown || []).reduce((s, d) => s + d.absent_minutes, 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${TYPE_GRADIENT[station.station_type] || 'from-slate-500 to-slate-600'} flex items-center justify-center text-white font-bold text-xl`}>
          {station.station_id}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{station.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-400">{station.station_id}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[station.station_type] || 'bg-slate-100 text-slate-600'}`}>
              {station.station_type}
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

      {(() => {
        const days = (station.daily_breakdown || []).length || 1;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Working / Day" value={fmtHours(station.working_minutes / days)} sub={`${fmtHours(station.working_minutes)} total`} icon={Wrench} color="green" />
            <MetricCard label="Idle / Day" value={fmtHours(station.idle_minutes / days)} sub={`${fmtHours(station.idle_minutes)} total`} icon={Coffee} color="amber" />
            <MetricCard label="Downtime" value={fmtHours(totalDowntime / days)} sub={`${fmtHours(totalDowntime)} total unoccupied`} icon={AlertCircle} color="rose" />
            <MetricCard label="Utilization" value={`${station.utilization_pct}%`} sub="working / total tracked time" icon={Percent} color="green" />
            <MetricCard label="Units Produced" value={station.total_units_produced} sub={`~${(station.total_units_produced / days).toFixed(0)} / day`} icon={Package} color="purple" />
            <MetricCard label="Throughput" value={`${station.throughput_rate.toFixed(2)}/hr`} sub="per active hour" icon={TrendingUp} color="indigo" />
            <MetricCard label="Production Trend" value={`${trendSlope > 0 ? '+' : ''}${trendSlope.toFixed(1)} u/day`} sub={trendLabel} icon={TrendIcon} color={trendColor} />
            <MetricCard label="Days Tracked" value={days} sub={`${fmtHours(station.occupancy_minutes / days)} occupied / day`} icon={Clock} color="blue" />
          </div>
        );
      })()}

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-500 mb-1">Utilization</p>
        <UtilizationBar value={station.utilization_pct} height="h-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Occupancy Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
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
                <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Utilization" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Activity</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Min', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => `${v.toFixed(0)} min`}
                />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Working" />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Idle" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
