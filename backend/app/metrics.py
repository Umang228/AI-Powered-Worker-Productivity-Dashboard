"""Productivity metric computations.

Assumptions (documented here and in the README):
- Each activity event (working / idle / absent) represents the worker's state
  for the next 5-minute interval until the following event.
- product_count events are point-in-time and contribute units but not duration.
- Utilization % = active_time / (active_time + idle_time + absent_time) * 100.
- Occupancy of a workstation = total time any worker is in "working" or "idle"
  state at that station (i.e., they are present but not necessarily productive).
- Throughput rate = total units / working hours at a workstation.
- Units per hour = total units / active hours for a worker.
"""

import math
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Event, Worker, Workstation
from app import schemas

INTERVAL_MINUTES = 5


def _linear_slope(values: list[float]) -> float:
    """Slope of a simple linear regression over equally-spaced points."""
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2.0
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den > 0 else 0.0


def _compute_worker_metrics(db: Session) -> list[schemas.WorkerMetrics]:
    workers = db.query(Worker).all()
    results = []

    for w in workers:
        events = (
            db.query(Event)
            .filter(Event.worker_id == w.worker_id)
            .order_by(Event.timestamp)
            .all()
        )

        active_min = 0.0
        idle_min = 0.0
        absent_min = 0.0
        total_units = 0
        confidence_sum = 0.0
        confidence_count = 0

        daily = defaultdict(lambda: {"active": 0.0, "idle": 0.0, "absent": 0.0, "units": 0})
        am = {"active": 0.0, "total": 0.0}
        pm = {"active": 0.0, "total": 0.0}

        for ev in events:
            day_key = ev.timestamp.strftime("%Y-%m-%d")
            confidence_sum += ev.confidence
            confidence_count += 1

            h = ev.timestamp.hour
            half = am if h < 13 else pm

            if ev.event_type == "working":
                active_min += INTERVAL_MINUTES
                daily[day_key]["active"] += INTERVAL_MINUTES
                half["active"] += INTERVAL_MINUTES
                half["total"] += INTERVAL_MINUTES
            elif ev.event_type == "idle":
                idle_min += INTERVAL_MINUTES
                daily[day_key]["idle"] += INTERVAL_MINUTES
                half["total"] += INTERVAL_MINUTES
            elif ev.event_type == "absent":
                absent_min += INTERVAL_MINUTES
                daily[day_key]["absent"] += INTERVAL_MINUTES
                half["total"] += INTERVAL_MINUTES
            elif ev.event_type == "product_count":
                total_units += ev.count
                daily[day_key]["units"] += ev.count

        total_min = active_min + idle_min + absent_min
        utilization = (active_min / total_min * 100) if total_min > 0 else 0.0
        active_hours = active_min / 60.0
        uph = (total_units / active_hours) if active_hours > 0 else 0.0
        avg_conf = (confidence_sum / confidence_count) if confidence_count > 0 else 0.0

        am_util = (am["active"] / am["total"] * 100) if am["total"] > 0 else 0.0
        pm_util = (pm["active"] / pm["total"] * 100) if pm["total"] > 0 else 0.0

        daily_breakdown = [
            schemas.DailyBreakdown(
                date=d,
                active_minutes=round(v["active"], 1),
                idle_minutes=round(v["idle"], 1),
                absent_minutes=round(v["absent"], 1),
                units_produced=v["units"],
            )
            for d, v in sorted(daily.items())
        ]

        daily_utils = []
        for v in [daily[d] for d in sorted(daily.keys())]:
            dt = v["active"] + v["idle"] + v["absent"]
            daily_utils.append((v["active"] / dt * 100) if dt > 0 else 0.0)
        daily_units = [daily[d]["units"] for d in sorted(daily.keys())]

        if len(daily_utils) >= 2:
            mean_u = sum(daily_utils) / len(daily_utils)
            variance = sum((x - mean_u) ** 2 for x in daily_utils) / len(daily_utils)
            std_dev = math.sqrt(variance)
            consistency = max(0.0, min(100.0, 100.0 - std_dev))
        else:
            consistency = 100.0

        trend = _linear_slope(daily_units)

        results.append(schemas.WorkerMetrics(
            worker_id=w.worker_id,
            name=w.name,
            department=w.department,
            total_active_minutes=round(active_min, 1),
            total_idle_minutes=round(idle_min, 1),
            total_absent_minutes=round(absent_min, 1),
            utilization_pct=round(utilization, 1),
            total_units_produced=total_units,
            units_per_hour=round(uph, 2),
            avg_confidence=round(avg_conf, 3),
            consistency_score=round(consistency, 1),
            am_utilization=round(am_util, 1),
            pm_utilization=round(pm_util, 1),
            trend_slope=round(trend, 2),
            daily_breakdown=daily_breakdown,
        ))

    return results


def _compute_workstation_metrics(db: Session) -> list[schemas.WorkstationMetrics]:
    stations = db.query(Workstation).all()
    results = []

    for s in stations:
        events = (
            db.query(Event)
            .filter(Event.workstation_id == s.station_id)
            .order_by(Event.timestamp)
            .all()
        )

        working_min = 0.0
        idle_min = 0.0
        total_units = 0
        total_possible_min = 0.0
        confidence_sum = 0.0
        confidence_count = 0

        daily = defaultdict(lambda: {"active": 0.0, "idle": 0.0, "absent": 0.0, "units": 0})

        for ev in events:
            day_key = ev.timestamp.strftime("%Y-%m-%d")
            confidence_sum += ev.confidence
            confidence_count += 1

            if ev.event_type == "working":
                working_min += INTERVAL_MINUTES
                total_possible_min += INTERVAL_MINUTES
                daily[day_key]["active"] += INTERVAL_MINUTES
            elif ev.event_type == "idle":
                idle_min += INTERVAL_MINUTES
                total_possible_min += INTERVAL_MINUTES
                daily[day_key]["idle"] += INTERVAL_MINUTES
            elif ev.event_type == "absent":
                total_possible_min += INTERVAL_MINUTES
                daily[day_key]["absent"] += INTERVAL_MINUTES
            elif ev.event_type == "product_count":
                total_units += ev.count
                daily[day_key]["units"] += ev.count

        occupancy_min = working_min + idle_min
        utilization = (working_min / total_possible_min * 100) if total_possible_min > 0 else 0.0
        working_hours = working_min / 60.0
        throughput = (total_units / working_hours) if working_hours > 0 else 0.0
        avg_conf = (confidence_sum / confidence_count) if confidence_count > 0 else 0.0

        daily_breakdown = [
            schemas.DailyBreakdown(
                date=d,
                active_minutes=round(v["active"], 1),
                idle_minutes=round(v["idle"], 1),
                absent_minutes=round(v["absent"], 1),
                units_produced=v["units"],
            )
            for d, v in sorted(daily.items())
        ]

        daily_units = [daily[d]["units"] for d in sorted(daily.keys())]
        trend = _linear_slope(daily_units)

        results.append(schemas.WorkstationMetrics(
            station_id=s.station_id,
            name=s.name,
            station_type=s.station_type,
            occupancy_minutes=round(occupancy_min, 1),
            working_minutes=round(working_min, 1),
            idle_minutes=round(idle_min, 1),
            utilization_pct=round(utilization, 1),
            total_units_produced=total_units,
            throughput_rate=round(throughput, 2),
            avg_confidence=round(avg_conf, 3),
            trend_slope=round(trend, 2),
            daily_breakdown=daily_breakdown,
        ))

    return results


def _compute_factory_metrics(
    db: Session,
    worker_metrics: list[schemas.WorkerMetrics],
    workstation_metrics: list[schemas.WorkstationMetrics],
) -> schemas.FactoryMetrics:
    total_productive = sum(w.total_active_minutes for w in worker_metrics)
    total_idle = sum(w.total_idle_minutes for w in worker_metrics)
    total_absent = sum(w.total_absent_minutes for w in worker_metrics)
    total_production = sum(w.total_units_produced for w in worker_metrics)

    all_dates = set()
    for w in worker_metrics:
        for d in w.daily_breakdown:
            all_dates.add(d.date)
    num_days = len(all_dates) or 1

    active_hours = total_productive / 60.0
    avg_rate = (total_production / active_hours) if active_hours > 0 else 0.0

    avg_util = (
        sum(w.utilization_pct for w in worker_metrics) / len(worker_metrics)
        if worker_metrics
        else 0.0
    )

    all_confs = [w.avg_confidence for w in worker_metrics if w.avg_confidence > 0]
    avg_confidence = sum(all_confs) / len(all_confs) if all_confs else 0.0

    dept_map = defaultdict(list)
    for w in worker_metrics:
        dept_map[w.department].append(w)

    departments = []
    for dept, members in sorted(dept_map.items()):
        dept_active = sum(m.total_active_minutes for m in members)
        dept_idle = sum(m.total_idle_minutes for m in members)
        dept_absent = sum(m.total_absent_minutes for m in members)
        dept_units = sum(m.total_units_produced for m in members)
        dept_avg_util = sum(m.utilization_pct for m in members) / len(members)
        dept_avg_uph = sum(m.units_per_hour for m in members) / len(members)
        departments.append(schemas.DepartmentMetrics(
            department=dept,
            worker_count=len(members),
            total_active_minutes=round(dept_active, 1),
            total_idle_minutes=round(dept_idle, 1),
            total_absent_minutes=round(dept_absent, 1),
            avg_utilization=round(dept_avg_util, 1),
            total_units_produced=dept_units,
            avg_units_per_hour=round(dept_avg_uph, 2),
        ))

    hourly = defaultdict(lambda: {"active": 0.0, "idle": 0.0, "units": 0})
    activity_events = (
        db.query(Event)
        .filter(Event.event_type.in_(["working", "idle", "absent", "product_count"]))
        .all()
    )
    for ev in activity_events:
        h = ev.timestamp.hour
        if ev.event_type == "working":
            hourly[h]["active"] += INTERVAL_MINUTES
        elif ev.event_type == "idle":
            hourly[h]["idle"] += INTERVAL_MINUTES
        elif ev.event_type == "product_count":
            hourly[h]["units"] += ev.count

    hourly_breakdown = [
        schemas.HourlyBreakdown(
            hour=h,
            active_minutes=round(v["active"], 1),
            idle_minutes=round(v["idle"], 1),
            units_produced=v["units"],
        )
        for h, v in sorted(hourly.items())
    ]

    return schemas.FactoryMetrics(
        total_productive_minutes=round(total_productive, 1),
        total_idle_minutes=round(total_idle, 1),
        total_absent_minutes=round(total_absent, 1),
        total_production_count=total_production,
        avg_production_rate=round(avg_rate, 2),
        avg_utilization=round(avg_util, 1),
        avg_confidence=round(avg_confidence, 3),
        total_workers=len(worker_metrics),
        total_workstations=len(workstation_metrics),
        num_days=num_days,
        departments=departments,
        hourly_breakdown=hourly_breakdown,
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
