# AI-Powered Worker Productivity Dashboard

A full-stack web application that ingests AI-generated CCTV events from a manufacturing factory and displays real-time productivity metrics for workers and workstations.

---

## Architecture Overview

```
┌─────────────┐     JSON events     ┌──────────────────┐     REST API     ┌────────────────┐
│  Edge / CV   │ ──────────────────► │  FastAPI Backend  │ ◄──────────────► │ React Dashboard│
│  Cameras     │   POST /api/events  │  (Python)         │  GET /api/…      │ (Vite + TW)    │
└─────────────┘                      │                   │                  └────────────────┘
                                     │  ┌─────────────┐  │
                                     │  │   SQLite     │  │
                                     │  │   Database   │  │
                                     │  └─────────────┘  │
                                     └──────────────────┘
```

**Edge → Backend**: AI-powered cameras run computer vision models that produce structured JSON events (working, idle, absent, product_count). These are POSTed to the backend individually (`/api/events`) or in batches (`/api/events/batch`).

**Backend → Database**: FastAPI validates incoming events, deduplicates them via SHA-256 hash, and persists them in SQLite. The backend computes metrics on demand from the raw event data.

**Backend → Dashboard**: The React frontend fetches aggregated metrics via `/api/metrics/dashboard` and renders them in an interactive UI.

---

## Quick Start

### With Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `localhost:8000`.

---

## Database Schema

### Workers
| Column      | Type   | Description           |
|-------------|--------|-----------------------|
| worker_id   | STRING | Primary key (e.g. W1) |
| name        | STRING | Full name             |
| department  | STRING | Department assignment  |

### Workstations
| Column       | Type   | Description              |
|--------------|--------|--------------------------|
| station_id   | STRING | Primary key (e.g. S1)    |
| name         | STRING | Human-readable name      |
| station_type | STRING | Category (Assembly, etc) |

### Events
| Column         | Type     | Description                                     |
|----------------|----------|-------------------------------------------------|
| id             | INTEGER  | Auto-increment primary key                      |
| timestamp      | DATETIME | When the CV system captured the event           |
| worker_id      | STRING   | FK → workers                                    |
| workstation_id | STRING   | FK → workstations                               |
| event_type     | STRING   | working / idle / absent / product_count         |
| confidence     | FLOAT    | Model confidence score (0–1)                    |
| count          | INTEGER  | Units produced (only for product_count events)  |
| event_hash     | STRING   | SHA-256 dedup key (unique index)                |

Indexes on `(worker_id, timestamp)`, `(workstation_id, timestamp)`, `event_type`, `timestamp`, and `event_hash`.

---

## Metric Definitions

### Assumptions

1. **5-minute intervals**: The CV system samples every 5 minutes. Each activity event (working/idle/absent) represents the worker's state for that 5-minute window.
2. **product_count events are point-in-time**: They record units produced but do not consume a time interval. They are always associated with a worker who is in "working" state.
3. **Out-of-order timestamps**: Events are stored as-is. Metrics are computed by counting event types, so ordering does not affect totals.

### Worker-Level Metrics
| Metric              | Formula                                            |
|---------------------|----------------------------------------------------|
| Total Active Time   | Count of "working" events × 5 minutes              |
| Total Idle Time     | Count of "idle" events × 5 minutes                 |
| Utilization %       | active_time / (active + idle + absent) × 100       |
| Total Units         | SUM(count) from product_count events               |
| Units per Hour      | total_units / (active_time in hours)                |

### Workstation-Level Metrics
| Metric           | Formula                                              |
|------------------|------------------------------------------------------|
| Occupancy Time   | Count of (working + idle) events × 5 min             |
| Utilization %    | working_time / (working + idle + absent) × 100       |
| Total Units      | SUM(count) from product_count events at station       |
| Throughput Rate  | total_units / (occupancy_time in hours)               |

### Factory-Level Metrics
| Metric               | Formula                                          |
|-----------------------|--------------------------------------------------|
| Total Productive Time | SUM of all worker active times                   |
| Total Production      | SUM of all units produced                        |
| Avg Production Rate   | total_units / total_active_hours                 |
| Avg Utilization       | MEAN of all worker utilization percentages        |

### Production Event Aggregation

`product_count` events carry a `count` field indicating units produced in that instant. They are always emitted while the worker is in a "working" state. Units are summed per worker and per workstation independently. The relationship: a `product_count` event at timestamp T means the worker produced `count` units around time T, during a period where the latest activity event was "working."

---

## API Endpoints

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| GET    | `/api/health`                         | Health check                   |
| POST   | `/api/seed?days=5`                    | Wipe & reseed dummy data       |
| POST   | `/api/events`                         | Ingest single event            |
| POST   | `/api/events/batch`                   | Ingest batch of events         |
| GET    | `/api/events`                         | List events (filterable)       |
| GET    | `/api/workers`                        | List all workers               |
| GET    | `/api/workstations`                   | List all workstations          |
| GET    | `/api/metrics/dashboard`              | Full dashboard payload         |
| GET    | `/api/metrics/workers`                | All worker metrics             |
| GET    | `/api/metrics/workers/{worker_id}`    | Single worker metrics          |
| GET    | `/api/metrics/workstations`           | All workstation metrics        |
| GET    | `/api/metrics/workstations/{id}`      | Single workstation metrics     |

---

## Handling Edge Cases

### Intermittent Connectivity

- **Batch ingestion**: The `/api/events/batch` endpoint accepts arrays of events, allowing edge devices to buffer events locally during connectivity loss and send them when connectivity resumes.
- **Idempotent ingestion**: Each event is hashed (SHA-256 of timestamp + worker + station + type). If a duplicate is received, it is silently ignored. This makes retries safe.
- **No ordering dependency**: Metrics are computed from aggregate counts, not sequential state machines, so late-arriving events are incorporated correctly.

### Duplicate Events

- Every event is assigned a deterministic hash: `SHA256(timestamp|worker_id|workstation_id|event_type)`.
- The `event_hash` column has a unique constraint. If a duplicate arrives, the system returns the existing event (for single ingestion) or increments a `duplicates_skipped` counter (for batch ingestion).
- This guarantees exactly-once semantics at the data layer.

### Out-of-Order Timestamps

- Events are stored with their original timestamp regardless of arrival order.
- Metric computation aggregates by counting event types (not by replaying a timeline), so out-of-order events produce the same results.
- The events list endpoint sorts by timestamp descending, giving a correct chronological view.

---

## Theoretical Questions

### 1. Model Versioning

To add model versioning:

- **Add a `model_version` field** to the event schema (e.g. `"model_version": "yolov8-2.1.3"`).
- **Store model metadata** in a `models` table (version, architecture, training date, accuracy benchmarks).
- **Tag every event** with the model version that produced it, enabling per-version accuracy analysis.
- **API filtering**: Allow metrics to be filtered/grouped by model version to compare performance across model updates.
- **Immutable events**: Never overwrite historical events when a new model is deployed; instead, reprocess footage with the new model and store new events with the updated version tag.

### 2. Detecting Model Drift

Drift detection strategies:

- **Confidence score monitoring**: Track the rolling average and distribution of `confidence` scores per model version. A sustained drop in mean confidence signals degradation.
- **Output distribution shifts**: Monitor the ratio of working:idle:absent events over time. A sudden shift (e.g. the model starts classifying everything as "working") indicates drift.
- **Human-in-the-loop validation**: Periodically sample events and have supervisors verify. Compute precision/recall against ground truth and alert when metrics drop below thresholds.
- **Statistical tests**: Apply KS-test or PSI (Population Stability Index) on confidence distributions week-over-week.
- **Alerting pipeline**: Feed metrics into a monitoring system (e.g. Prometheus + Grafana) with threshold-based alerts.

### 3. Triggering Retraining

Retraining pipeline design:

- **Threshold-based triggers**: When drift metrics (confidence drop, accuracy drop, distribution shift) exceed predefined thresholds, automatically queue a retraining job.
- **Scheduled retraining**: Run periodic retraining (e.g. weekly) on the latest annotated data as a baseline.
- **Data pipeline**: Continuously collect edge cases (low-confidence predictions, supervisor corrections) into a labeled dataset for incremental learning.
- **A/B deployment**: Deploy retrained models to a subset of cameras first, compare metrics against the existing model, and promote to full deployment only when improvements are confirmed.
- **Rollback mechanism**: Maintain the previous model version as a fallback and auto-revert if the new model's live metrics are worse.

### 4. Scaling from 5 Cameras → 100+ → Multi-Site

**5 cameras (current)**:
- Single SQLite database, single FastAPI instance.
- Sufficient for low throughput (~100 events/minute).

**100+ cameras (medium scale)**:
- **Replace SQLite with PostgreSQL or TimescaleDB** for concurrent writes and time-series optimizations.
- **Add a message queue** (Redis Streams, RabbitMQ, or Kafka) between edge devices and the backend to buffer spikes and decouple ingestion from processing.
- **Horizontal scaling**: Run multiple FastAPI workers behind a load balancer (nginx/HAProxy). Metrics computation moves to background workers or caching layer.
- **Pre-compute metrics**: Use periodic aggregation jobs (Celery/APScheduler) instead of real-time computation. Cache results in Redis.
- **CDN for frontend**: Serve the React app from a CDN for global low-latency access.

**Multi-site deployment**:
- **Per-site edge processing**: Each factory runs a local ingestion service that buffers and forwards events to a central data lake.
- **Central data warehouse**: Use a cloud data warehouse (BigQuery, Snowflake) for cross-site analytics.
- **Event streaming backbone**: Kafka or AWS Kinesis for reliable cross-site event transport.
- **Multi-tenant architecture**: Add `site_id` to all data models. Dashboard supports site selection and cross-site aggregation.
- **Edge autonomy**: Local dashboards continue to function during WAN outages; they sync to central when connectivity resumes.

---

## Tech Stack

| Layer     | Technology                                 |
|-----------|--------------------------------------------|
| Backend   | Python 3.12, FastAPI, SQLAlchemy, SQLite   |
| Frontend  | React 19, Vite, Tailwind CSS v4, Recharts  |
| Container | Docker, Docker Compose                     |
| Icons     | Lucide React                               |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application & routes
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── database.py      # Database engine & session
│   │   ├── metrics.py       # Metric computation logic
│   │   └── seed.py          # Dummy data generator
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── FactorySummary.jsx
│   │   │   ├── MetricCard.jsx
│   │   │   ├── UtilizationBar.jsx
│   │   │   ├── WorkerTable.jsx
│   │   │   ├── WorkerDetail.jsx
│   │   │   ├── WorkstationTable.jsx
│   │   │   └── WorkstationDetail.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
