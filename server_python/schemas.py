from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ScanRequest(BaseModel):
    roll_no: str
    event_id: int

class ScanResponse(BaseModel):
    action: str
    roll_no: str
    student_name: str
    message: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    duration_minutes: Optional[float] = None
    status: Optional[str] = None

class StudentCreate(BaseModel):
    roll_no: str
    name: str
    department: Optional[str] = None
    year: Optional[int] = None

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    start_time: str
    end_time: str
    duration_minutes: int
    min_attendance_percent: float = 75.0

class EventResponse(EventCreate):
    id: int
    session_token: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
