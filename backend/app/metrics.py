"""Productivity metric computations.

Assumptions (documented here and in the README):
- Each activity event (working / idle / absent) represents the worker's state
  for the next 5-minute interval until the following event.
- product_count events are point-in-time and contribute units but not duration.
- Utilization % = active_time / (active_time + idle_time + absent_time) * 100.
- Occupancy of a workstation = total time any worker is in "working" or "idle"
  state at that station (i.e., they are present but not necessarily productive).
- Throughput rate = total units / occupancy hours at a workstation.
- Units per hour = total units / active hours for a worker.
"""

from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Event, Worker, Workstation
from app import schemas

INTERVAL_MINUTES = 5


def _compute_worker_metrics(db: Session) -> list[schemas.WorkerMetrics]:
    workers = db.query(Worker).all()
    results = []

    for w in workers:
        events = (
            db.query(Event)
            .filter(Event.worker_id == w.worker_id, Event.event_type.in_(["working", "idle", "absent"]))
            .order_by(Event.timestamp)
            .all()
        )

        active_min = 0.0
        idle_min = 0.0
        absent_min = 0.0

        for ev in events:
            if ev.event_type == "working":
                active_min += INTERVAL_MINUTES
            elif ev.event_type == "idle":
                idle_min += INTERVAL_MINUTES
            elif ev.event_type == "absent":
                absent_min += INTERVAL_MINUTES

        total_min = active_min + idle_min + absent_min
        utilization = (active_min / total_min * 100) if total_min > 0 else 0.0

        total_units_row = (
            db.query(func.coalesce(func.sum(Event.count), 0))
            .filter(Event.worker_id == w.worker_id, Event.event_type == "product_count")
            .scalar()
        )
        total_units = int(total_units_row)

        active_hours = active_min / 60.0
        uph = (total_units / active_hours) if active_hours > 0 else 0.0

        results.append(schemas.WorkerMetrics(
            worker_id=w.worker_id,
            name=w.name,
            total_active_minutes=round(active_min, 1),
            total_idle_minutes=round(idle_min, 1),
            total_absent_minutes=round(absent_min, 1),
            utilization_pct=round(utilization, 1),
            total_units_produced=total_units,
            units_per_hour=round(uph, 2),
        ))

    return results


def _compute_workstation_metrics(db: Session) -> list[schemas.WorkstationMetrics]:
    stations = db.query(Workstation).all()
    results = []

    for s in stations:
        activity_events = (
            db.query(Event)
            .filter(
                Event.workstation_id == s.station_id,
                Event.event_type.in_(["working", "idle"]),
            )
            .all()
        )
        occupancy_min = len(activity_events) * INTERVAL_MINUTES

        working_events = (
            db.query(Event)
            .filter(Event.workstation_id == s.station_id, Event.event_type == "working")
            .all()
        )
        working_min = len(working_events) * INTERVAL_MINUTES

        total_possible = (
            db.query(Event)
            .filter(
                Event.workstation_id == s.station_id,
                Event.event_type.in_(["working", "idle", "absent"]),
            )
            .count()
        ) * INTERVAL_MINUTES

        utilization = (working_min / total_possible * 100) if total_possible > 0 else 0.0

        total_units_row = (
            db.query(func.coalesce(func.sum(Event.count), 0))
            .filter(Event.workstation_id == s.station_id, Event.event_type == "product_count")
            .scalar()
        )
        total_units = int(total_units_row)

        occupancy_hours = occupancy_min / 60.0
        throughput = (total_units / occupancy_hours) if occupancy_hours > 0 else 0.0

        results.append(schemas.WorkstationMetrics(
            station_id=s.station_id,
            name=s.name,
            occupancy_minutes=round(occupancy_min, 1),
            utilization_pct=round(utilization, 1),
            total_units_produced=total_units,
            throughput_rate=round(throughput, 2),
        ))

    return results


def _compute_factory_metrics(
    db: Session,
    worker_metrics: list[schemas.WorkerMetrics],
    workstation_metrics: list[schemas.WorkstationMetrics],
) -> schemas.FactoryMetrics:
    total_productive = sum(w.total_active_minutes for w in worker_metrics)
    total_production = sum(w.total_units_produced for w in worker_metrics)
    total_events = db.query(Event).count()

    active_hours = total_productive / 60.0
    avg_rate = (total_production / active_hours) if active_hours > 0 else 0.0

    avg_util = (
        sum(w.utilization_pct for w in worker_metrics) / len(worker_metrics)
        if worker_metrics
        else 0.0
    )

    return schemas.FactoryMetrics(
        total_productive_minutes=round(total_productive, 1),
        total_production_count=total_production,
        avg_production_rate=round(avg_rate, 2),
        avg_utilization=round(avg_util, 1),
        total_workers=len(worker_metrics),
        total_workstations=len(workstation_metrics),
        total_events=total_events,
    )


def compute_dashboard(db: Session) -> schemas.DashboardResponse:
    worker_metrics = _compute_worker_metrics(db)
    workstation_metrics = _compute_workstation_metrics(db)
    factory_metrics = _compute_factory_metrics(db, worker_metrics, workstation_metrics)
    return schemas.DashboardResponse(
        factory=factory_metrics,
        workers=worker_metrics,
        workstations=workstation_metrics,
    )
