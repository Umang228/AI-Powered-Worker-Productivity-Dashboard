import MetricCard from './MetricCard';
import {
  Clock, Package, TrendingUp, Percent, Users, Monitor, Activity,
} from 'lucide-react';

export default function FactorySummary({ factory }) {
  const fmtHours = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Factory Overview</h2>
      <p className="text-sm text-slate-400 mb-6">Aggregate productivity across all workers and workstations</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Productive Time"
          value={fmtHours(factory.total_productive_minutes)}
          sub={`${factory.total_productive_minutes.toLocaleString()} minutes`}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          label="Total Production"
          value={factory.total_production_count.toLocaleString()}
          sub="units produced"
          icon={Package}
          color="green"
        />
        <MetricCard
          label="Avg Production Rate"
          value={`${factory.avg_production_rate.toFixed(1)}`}
          sub="units per hour"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Active Workers"
          value={factory.total_workers}
          icon={Users}
          color="indigo"
        />
        <MetricCard
          label="Workstations"
          value={factory.total_workstations}
          icon={Monitor}
          color="cyan"
        />
        <MetricCard
          label="Total Events"
          value={factory.total_events.toLocaleString()}
          icon={Activity}
          color="rose"
        />
      </div>
    </div>
  );
}
