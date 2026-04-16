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


class DailyBreakdown(BaseModel):
    date: str
    active_minutes: float
    idle_minutes: float
    absent_minutes: float
    units_produced: int


class HourlyBreakdown(BaseModel):
    hour: int
    active_minutes: float
    idle_minutes: float
    units_produced: int


class WorkerMetrics(BaseModel):
    worker_id: str
    name: str
    department: str
    total_active_minutes: float
    total_idle_minutes: float
    total_absent_minutes: float
    utilization_pct: float
    total_units_produced: int
    units_per_hour: float
    avg_confidence: float
    consistency_score: float = 0.0
    am_utilization: float = 0.0
    pm_utilization: float = 0.0
    trend_slope: float = 0.0
    daily_breakdown: List[DailyBreakdown] = []


class WorkstationMetrics(BaseModel):
    station_id: str
    name: str
    station_type: str
    occupancy_minutes: float
    working_minutes: float
    idle_minutes: float
    utilization_pct: float
    total_units_produced: int
    throughput_rate: float
    avg_confidence: float
    trend_slope: float = 0.0
    daily_breakdown: List[DailyBreakdown] = []


class DepartmentMetrics(BaseModel):
    department: str
    worker_count: int
    total_active_minutes: float
    total_idle_minutes: float
    total_absent_minutes: float
    avg_utilization: float
    total_units_produced: int
    avg_units_per_hour: float


class FactoryMetrics(BaseModel):
    total_productive_minutes: float
    total_idle_minutes: float
    total_absent_minutes: float
    total_production_count: int
    avg_production_rate: float
    avg_utilization: float
    avg_confidence: float
    total_workers: int
    total_workstations: int
    num_days: int
    departments: List[DepartmentMetrics] = []
    hourly_breakdown: List[HourlyBreakdown] = []


class DashboardResponse(BaseModel):
    factory: FactoryMetrics
    workers: List[WorkerMetrics]
    workstations: List[WorkstationMetrics]
