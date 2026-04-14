from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Worker(Base):
    __tablename__ = "workers"

    worker_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    department = Column(String, default="Production")

    events = relationship("Event", back_populates="worker")


class Workstation(Base):
    __tablename__ = "workstations"

    station_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    station_type = Column(String, default="Assembly")

    events = relationship("Event", back_populates="workstation")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    worker_id = Column(String, ForeignKey("workers.worker_id"), nullable=False, index=True)
    workstation_id = Column(String, ForeignKey("workstations.station_id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    confidence = Column(Float, default=1.0)
    count = Column(Integer, default=0)
    event_hash = Column(String, unique=True, nullable=False, index=True)

    worker = relationship("Worker", back_populates="events")
    workstation = relationship("Workstation", back_populates="events")

    __table_args__ = (
        Index("ix_worker_timestamp", "worker_id", "timestamp"),
        Index("ix_station_timestamp", "workstation_id", "timestamp"),
    )
