const BASE = import.meta.env.VITE_API_URL || 'https://ai-powered-worker-productivity-dashboard-yhar.onrender.com/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  getDashboard: () => request('/metrics/dashboard'),
  getWorkerMetrics: () => request('/metrics/workers'),
  getWorkstationMetrics: () => request('/metrics/workstations'),
  getWorkers: () => request('/workers'),
  getWorkstations: () => request('/workstations'),
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  seedDatabase: (days = 5) => request(`/seed?days=${days}`, { method: 'POST' }),
  ingestEvent: (event) => request('/events', { method: 'POST', body: JSON.stringify(event) }),
};
