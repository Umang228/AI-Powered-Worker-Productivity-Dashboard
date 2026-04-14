from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class EventIn(BaseModel):
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str
    confidence: float = 1.0
    count: int = 0


class EventOut(BaseModel):
    id: int
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str
    confidence: float
    count: int

    class Config:
        from_attributes = True


class EventBatch(BaseModel):
    events: List[EventIn]


class WorkerOut(BaseModel):
    worker_id: str
    name: str
    department: str

    class Config:
        from_attributes = True


class WorkstationOut(BaseModel):
    station_id: str
    name: str
    station_type: str

    class Config:
        from_attributes = True


class WorkerMetrics(BaseModel):
    worker_id: str
    name: str
    total_active_minutes: float
    total_idle_minutes: float
    total_absent_minutes: float
    utilization_pct: float
    total_units_produced: int
    units_per_hour: float


class WorkstationMetrics(BaseModel):
    station_id: str
    name: str
    occupancy_minutes: float
    utilization_pct: float
    total_units_produced: int
    throughput_rate: float


class FactoryMetrics(BaseModel):
    total_productive_minutes: float
    total_production_count: int
    avg_production_rate: float
    avg_utilization: float
    total_workers: int
    total_workstations: int
    total_events: int


class DashboardResponse(BaseModel):
    factory: FactoryMetrics
    workers: List[WorkerMetrics]
    workstations: List[WorkstationMetrics]
