import { AlertTriangle, TrendingUp, TrendingDown, Award, Clock, Zap, Activity, Moon } from 'lucide-react';

function generateInsights(factory, workers, workstations) {
  const insights = [];

  if (!workers?.length) return insights;

  const sorted = [...workers].sort((a, b) => b.utilization_pct - a.utilization_pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  insights.push({
    type: 'success',
    icon: Award,
    title: 'Top Performer',
    text: `${best.name} leads utilization at ${best.utilization_pct.toFixed(1)}% with ${best.total_units_produced} units produced.`,
  });

  if (worst.utilization_pct < 60) {
    insights.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Low Utilization Alert',
      text: `${worst.name} has the lowest utilization at ${worst.utilization_pct.toFixed(1)}%. Consider reviewing workload or scheduling.`,
    });
  }

  const totalShift = factory.total_productive_minutes + factory.total_idle_minutes + factory.total_absent_minutes;
  const totalIdlePct = totalShift > 0 ? (factory.total_idle_minutes / totalShift * 100) : 0;
  if (totalIdlePct > 15) {
    const numWorkers = factory.total_workers || 1;
    const numDays = factory.num_days || 1;
    const avgIdlePerDay = factory.total_idle_minutes / numWorkers / numDays;
    insights.push({
      type: 'warning',
      icon: Clock,
      title: 'High Idle Time',
      text: `Idle time is ${totalIdlePct.toFixed(1)}% of shift time (~${Math.round(avgIdlePerDay)} min/worker/day). Optimizing workflows could improve throughput.`,
    });
  }

  const topProducer = [...workers].sort((a, b) => b.units_per_hour - a.units_per_hour)[0];
  insights.push({
    type: 'info',
    icon: Zap,
    title: 'Fastest Producer',
    text: `${topProducer.name} achieves the highest throughput at ${topProducer.units_per_hour.toFixed(1)} units/hour.`,
  });

  if (factory.departments?.length > 1) {
    const deptSorted = [...factory.departments].sort((a, b) => b.avg_utilization - a.avg_utilization);
    const gap = deptSorted[0].avg_utilization - deptSorted[deptSorted.length - 1].avg_utilization;
    if (gap > 10) {
      insights.push({
        type: 'info',
        icon: TrendingDown,
        title: 'Department Imbalance',
        text: `${deptSorted[0].department} (${deptSorted[0].avg_utilization.toFixed(1)}%) outperforms ${deptSorted[deptSorted.length - 1].department} (${deptSorted[deptSorted.length - 1].avg_utilization.toFixed(1)}%) by ${gap.toFixed(1)} percentage points.`,
      });
    }
  }

  if (factory.avg_utilization >= 70) {
    insights.push({
      type: 'success',
      icon: TrendingUp,
      title: 'Strong Utilization',
      text: `Factory-wide utilization is ${factory.avg_utilization.toFixed(1)}%, above the 70% efficiency target.`,
    });
  }

  if (workstations?.length) {
    const bestStation = [...workstations].sort((a, b) => b.throughput_rate - a.throughput_rate)[0];
    insights.push({
      type: 'info',
      icon: Zap,
      title: 'Top Workstation',
      text: `${bestStation.name} has the highest throughput at ${bestStation.throughput_rate.toFixed(1)} units/hr with ${bestStation.utilization_pct.toFixed(1)}% utilization.`,
    });
  }

  const inconsistent = workers.filter((w) => (w.consistency_score ?? 100) < 70);
  if (inconsistent.length > 0) {
    const names = inconsistent.slice(0, 3).map((w) => w.name).join(', ');
    insights.push({
      type: 'warning',
      icon: Activity,
      title: 'Inconsistent Workers',
      text: `${names}${inconsistent.length > 3 ? ` and ${inconsistent.length - 3} more` : ''} ha${inconsistent.length === 1 ? 's' : 've'} consistency scores below 70, indicating high day-to-day variability.`,
    });
  }

  const fatigued = workers.filter((w) => (w.am_utilization || 0) - (w.pm_utilization || 0) > 10);
  if (fatigued.length > 0) {
    const names = fatigued.slice(0, 3).map((w) => w.name).join(', ');
    insights.push({
      type: 'warning',
      icon: Moon,
      title: 'Afternoon Fatigue',
      text: `${names}${fatigued.length > 3 ? ` and ${fatigued.length - 3} more` : ''} show${fatigued.length === 1 ? 's' : ''} >10pp drop in afternoon utilization vs morning.`,
    });
  }

  const declining = workers.filter((w) => (w.trend_slope || 0) < -1);
  if (declining.length > 0) {
    const names = declining.slice(0, 3).map((w) => w.name).join(', ');
    insights.push({
      type: 'warning',
      icon: TrendingDown,
      title: 'Declining Production',
      text: `${names}${declining.length > 3 ? ` and ${declining.length - 3} more` : ''} show${declining.length === 1 ? 's' : ''} a declining production trend (>${Math.abs(declining[0].trend_slope).toFixed(1)} fewer units/day).`,
    });
  }

  const improving = workers.filter((w) => (w.trend_slope || 0) > 1);
  if (improving.length > 0) {
    const names = improving.slice(0, 3).map((w) => w.name).join(', ');
    insights.push({
      type: 'success',
      icon: TrendingUp,
      title: 'Rising Stars',
      text: `${names}${improving.length > 3 ? ` and ${improving.length - 3} more` : ''} show${improving.length === 1 ? 's' : ''} an improving production trend.`,
    });
  }

  return insights;
}

const TYPE_STYLES = {
  success: 'border-emerald-200 bg-emerald-50/50',
  warning: 'border-amber-200 bg-amber-50/50',
  info: 'border-blue-200 bg-blue-50/50',
};

const ICON_STYLES = {
  success: 'text-emerald-600 bg-emerald-100',
  warning: 'text-amber-600 bg-amber-100',
  info: 'text-blue-600 bg-blue-100',
};

export default function Insights({ factory, workers, workstations }) {
  const insights = generateInsights(factory, workers, workstations);

  if (!insights.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">AI Insights & Alerts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className={`rounded-xl border p-4 ${TYPE_STYLES[insight.type]}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICON_STYLES[insight.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{insight.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
