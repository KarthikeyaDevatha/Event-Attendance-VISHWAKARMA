from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String, unique=True, index=True)
    name = Column(String)
    department = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attendance_logs = relationship("AttendanceLog", back_populates="student")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    event_date = Column(String) # Storing as YYYY-MM-DD string for simplicity
    start_time = Column(String) # ISO format
    end_time = Column(String)   # ISO format
    duration_minutes = Column(Integer)
    min_attendance_percent = Column(Float, default=75.0)
    session_token = Column(String, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attendance_logs = relationship("AttendanceLog", back_populates="event")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String, ForeignKey("students.roll_no"))
    event_id = Column(Integer, ForeignKey("events.id"))
    check_in_time = Column(String) # ISO format
    check_out_time = Column(String, nullable=True) # ISO format
    duration_minutes = Column(Float, nullable=True)
    status = Column(String, default="PENDING") # PENDING, PRESENT, ABSENT
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="attendance_logs")
    event = relationship("Event", back_populates="attendance_logs")
