import { RefreshCw, Activity, DatabaseZap } from 'lucide-react';

export default function Header({ onRefresh, onReseed, seeding, lastUpdated }) {
  const fmtTime = (d) => {
    if (!d) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Factory Productivity
              </h1>
              <p className="text-xs text-slate-400 leading-tight">AI-Powered Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Updated {fmtTime(lastUpdated)}
              </span>
            )}
            <button
              onClick={onReseed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <DatabaseZap className={`w-4 h-4 ${seeding ? 'animate-pulse' : ''}`} />
              {seeding ? 'Seeding...' : 'Reseed Data'}
            </button>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
