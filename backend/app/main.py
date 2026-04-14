import hashlib
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import engine, get_db, Base
from app.models import Event, Worker, Workstation
from app.schemas import (
    EventIn, EventOut, EventBatch, WorkerOut, WorkstationOut,
    WorkerMetrics, WorkstationMetrics, FactoryMetrics, DashboardResponse,
)
from app.metrics import compute_dashboard, _compute_worker_metrics, _compute_workstation_metrics
from app.seed import seed_database, compute_event_hash

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Factory Productivity API",
    description="AI-powered worker productivity monitoring backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_seed():
    """Auto-seed the database on first run if it's empty."""
    db = next(get_db())
    try:
        if db.query(Worker).count() == 0:
            seed_database(db, days=5)
    finally:
        db.close()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ── Seed / Reset ──────────────────────────────────────────────────────────────

@app.post("/api/seed", tags=["admin"])
def reseed(days: int = Query(default=5, ge=1, le=30), db: Session = Depends(get_db)):
    """Wipe and re-populate with fresh dummy data for the given number of days."""
    result = seed_database(db, days=days)
    return {"message": "Database reseeded", **result}


# ── Event Ingestion ──────────────────────────────────────────────────────────

@app.post("/api/events", response_model=EventOut, status_code=201, tags=["events"])
def ingest_event(event: EventIn, db: Session = Depends(get_db)):
    """Ingest a single AI event. Duplicates (same timestamp+worker+station+type) are silently ignored."""
    worker = db.query(Worker).filter(Worker.worker_id == event.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {event.worker_id} not found")

    station = db.query(Workstation).filter(Workstation.station_id == event.workstation_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Workstation {event.workstation_id} not found")

    if event.event_type not in ("working", "idle", "absent", "product_count"):
        raise HTTPException(status_code=400, detail=f"Invalid event_type: {event.event_type}")

    eh = compute_event_hash(event.timestamp, event.worker_id, event.workstation_id, event.event_type)
    existing = db.query(Event).filter(Event.event_hash == eh).first()
    if existing:
        return existing

    db_event = Event(
        timestamp=event.timestamp,
        worker_id=event.worker_id,
        workstation_id=event.workstation_id,
        event_type=event.event_type,
        confidence=event.confidence,
        count=event.count,
        event_hash=eh,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@app.post("/api/events/batch", tags=["events"])
def ingest_batch(batch: EventBatch, db: Session = Depends(get_db)):
    """Ingest multiple events at once. Duplicates are skipped. Out-of-order timestamps are accepted and sorted during metric computation."""
    inserted = 0
    duplicates = 0
    errors = []

    for event in batch.events:
        if event.event_type not in ("working", "idle", "absent", "product_count"):
            errors.append(f"Invalid event_type '{event.event_type}' for worker {event.worker_id}")
            continue

        eh = compute_event_hash(event.timestamp, event.worker_id, event.workstation_id, event.event_type)
        existing = db.query(Event).filter(Event.event_hash == eh).first()
        if existing:
            duplicates += 1
            continue

        db.add(Event(
            timestamp=event.timestamp,
            worker_id=event.worker_id,
            workstation_id=event.workstation_id,
            event_type=event.event_type,
            confidence=event.confidence,
            count=event.count,
            event_hash=eh,
        ))
        inserted += 1

    db.commit()
    return {"inserted": inserted, "duplicates_skipped": duplicates, "errors": errors}


# ── Events Query ──────────────────────────────────────────────────────────────

@app.get("/api/events", response_model=list[EventOut], tags=["events"])
def list_events(
    worker_id: Optional[str] = None,
    workstation_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=100, le=5000),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Event)
    if worker_id:
        q = q.filter(Event.worker_id == worker_id)
    if workstation_id:
        q = q.filter(Event.workstation_id == workstation_id)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    return q.order_by(Event.timestamp.desc()).offset(offset).limit(limit).all()


# ── Workers & Workstations ────────────────────────────────────────────────────

@app.get("/api/workers", response_model=list[WorkerOut], tags=["metadata"])
def list_workers(db: Session = Depends(get_db)):
    return db.query(Worker).all()


@app.get("/api/workstations", response_model=list[WorkstationOut], tags=["metadata"])
def list_workstations(db: Session = Depends(get_db)):
    return db.query(Workstation).all()


# ── Metrics ───────────────────────────────────────────────────────────────────

@app.get("/api/metrics/dashboard", response_model=DashboardResponse, tags=["metrics"])
def dashboard(db: Session = Depends(get_db)):
    return compute_dashboard(db)


@app.get("/api/metrics/workers", response_model=list[WorkerMetrics], tags=["metrics"])
def worker_metrics(db: Session = Depends(get_db)):
    return _compute_worker_metrics(db)


@app.get("/api/metrics/workers/{worker_id}", response_model=WorkerMetrics, tags=["metrics"])
def single_worker_metrics(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.worker_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    all_metrics = _compute_worker_metrics(db)
    for m in all_metrics:
        if m.worker_id == worker_id:
            return m
    raise HTTPException(status_code=404, detail="Metrics not found")


@app.get("/api/metrics/workstations", response_model=list[WorkstationMetrics], tags=["metrics"])
def workstation_metrics(db: Session = Depends(get_db)):
    return _compute_workstation_metrics(db)


@app.get("/api/metrics/workstations/{station_id}", response_model=WorkstationMetrics, tags=["metrics"])
def single_workstation_metrics(station_id: str, db: Session = Depends(get_db)):
    station = db.query(Workstation).filter(Workstation.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Workstation not found")
    all_metrics = _compute_workstation_metrics(db)
    for m in all_metrics:
        if m.station_id == station_id:
            return m
    raise HTTPException(status_code=404, detail="Metrics not found")
