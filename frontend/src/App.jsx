import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import FactorySummary from './components/FactorySummary';
import WorkerTable from './components/WorkerTable';
import WorkstationTable from './components/WorkstationTable';
import WorkerDetail from './components/WorkerDetail';
import WorkstationDetail from './components/WorkstationDetail';
import Insights from './components/Insights';
import Header from './components/Header';
import {
  Factory,
  Users,
  Monitor,
  Lightbulb,
  ChevronLeft,
} from 'lucide-react';

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('factory');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboard();
      setDashboard(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReseed = async () => {
    setSeeding(true);
    try {
      await api.seedDatabase(5);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-500 text-sm mb-5">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'factory', label: 'Factory', icon: Factory },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'workstations', label: 'Workstations', icon: Monitor },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
  ];

  const showDetail = selectedWorker || selectedStation;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onRefresh={fetchData} onReseed={handleReseed} seeding={seeding} lastUpdated={lastUpdated} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {showDetail ? (
          <div>
            <button
              onClick={() => { setSelectedWorker(null); setSelectedStation(null); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to overview
            </button>
            {selectedWorker && (
              <WorkerDetail
                worker={dashboard.workers.find((w) => w.worker_id === selectedWorker)}
              />
            )}
            {selectedStation && (
              <WorkstationDetail
                station={dashboard.workstations.find((s) => s.station_id === selectedStation)}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 mb-8 w-fit">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'factory' && <FactorySummary factory={dashboard.factory} workers={dashboard.workers} />}
            {activeTab === 'workers' && (
              <WorkerTable workers={dashboard.workers} onSelect={setSelectedWorker} />
            )}
            {activeTab === 'workstations' && (
              <WorkstationTable
                stations={dashboard.workstations}
                onSelect={setSelectedStation}
              />
            )}
            {activeTab === 'insights' && (
              <Insights factory={dashboard.factory} workers={dashboard.workers} workstations={dashboard.workstations} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
