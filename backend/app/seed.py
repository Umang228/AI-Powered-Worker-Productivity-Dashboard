import hashlib
import random
from datetime import datetime, timedelta
from app.models import Worker, Workstation, Event
from sqlalchemy.orm import Session

WORKERS = [
    {"worker_id": "W1", "name": "Alice Johnson", "department": "Assembly"},
    {"worker_id": "W2", "name": "Bob Martinez", "department": "Assembly"},
    {"worker_id": "W3", "name": "Carol Chen", "department": "Welding"},
    {"worker_id": "W4", "name": "David Kim", "department": "Welding"},
    {"worker_id": "W5", "name": "Eva Petrova", "department": "Packaging"},
    {"worker_id": "W6", "name": "Frank Okafor", "department": "Packaging"},
]

WORKSTATIONS = [
    {"station_id": "S1", "name": "Assembly Line A", "station_type": "Assembly"},
    {"station_id": "S2", "name": "Assembly Line B", "station_type": "Assembly"},
    {"station_id": "S3", "name": "Welding Bay 1", "station_type": "Welding"},
    {"station_id": "S4", "name": "Welding Bay 2", "station_type": "Welding"},
    {"station_id": "S5", "name": "Packaging Unit 1", "station_type": "Packaging"},
    {"station_id": "S6", "name": "Packaging Unit 2", "station_type": "Packaging"},
]

WORKER_STATION_MAP = {
    "W1": "S1", "W2": "S2", "W3": "S3",
    "W4": "S4", "W5": "S5", "W6": "S6",
}


def compute_event_hash(timestamp: datetime, worker_id: str, workstation_id: str, event_type: str) -> str:
    raw = f"{timestamp.isoformat()}|{worker_id}|{workstation_id}|{event_type}"
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_shift_events(
    worker_id: str,
    station_id: str,
    shift_date: datetime,
    shift_start_hour: int = 8,
    shift_end_hour: int = 17,
) -> list[dict]:
    """Generate realistic events for one worker across one shift.

    The shift is divided into 5-minute intervals. Each interval gets an activity
    event (working/idle/absent) and working intervals occasionally produce a
    product_count event. This models the CV system sampling every 5 minutes.
    """
    events = []
    current = shift_date.replace(hour=shift_start_hour, minute=0, second=0, microsecond=0)
    shift_end = shift_date.replace(hour=shift_end_hour, minute=0, second=0, microsecond=0)
    interval = timedelta(minutes=5)

    while current < shift_end:
        r = random.random()
        if r < 0.70:
            event_type = "working"
        elif r < 0.90:
            event_type = "idle"
        else:
            event_type = "absent"

        confidence = round(random.uniform(0.80, 0.99), 2)

        events.append({
            "timestamp": current,
            "worker_id": worker_id,
            "workstation_id": station_id,
            "event_type": event_type,
            "confidence": confidence,
            "count": 0,
        })

        if event_type == "working" and random.random() < 0.40:
            prod_time = current + timedelta(minutes=random.randint(1, 4))
            units = random.randint(1, 5)
            events.append({
                "timestamp": prod_time,
                "worker_id": worker_id,
                "workstation_id": station_id,
                "event_type": "product_count",
                "confidence": round(random.uniform(0.85, 0.99), 2),
                "count": units,
            })

        current += interval

    return events


def seed_database(db: Session, days: int = 5) -> dict:
    """Populate the database with workers, workstations, and realistic events.

    Returns a summary dict with counts.
    """
    db.query(Event).delete()
    db.query(Worker).delete()
    db.query(Workstation).delete()
    db.commit()

    for w in WORKERS:
        db.add(Worker(**w))
    for s in WORKSTATIONS:
        db.add(Workstation(**s))
    db.commit()

    base_date = datetime(2026, 1, 15)
    total_events = 0

    for day_offset in range(days):
        shift_date = base_date + timedelta(days=day_offset)
        for worker_id, station_id in WORKER_STATION_MAP.items():
            events = generate_shift_events(worker_id, station_id, shift_date)
            for e in events:
                eh = compute_event_hash(e["timestamp"], e["worker_id"], e["workstation_id"], e["event_type"])
                db.add(Event(event_hash=eh, **e))
                total_events += 1

    db.commit()
    return {
        "workers_seeded": len(WORKERS),
        "workstations_seeded": len(WORKSTATIONS),
        "events_seeded": total_events,
        "days": days,
    }
