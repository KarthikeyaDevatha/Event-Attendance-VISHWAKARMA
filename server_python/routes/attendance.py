from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import csv
import io
from .. import models, database

router = APIRouter()

@router.get("/event/{event_id}")
def get_event_attendance(event_id: int, db: Session = Depends(database.get_db)):
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id).all()
    # Join with student info
    results = []
    for log in logs:
        student = db.query(models.Student).filter(models.Student.roll_no == log.roll_no).first()
        results.append({
            "roll_no": log.roll_no,
            "student_name": student.name if student else "Unknown",
            "check_in_time": log.check_in_time,
            "check_out_time": log.check_out_time,
            "duration_minutes": log.duration_minutes,
            "status": log.status
        })
    return results

@router.get("/event/{event_id}/export")
def export_event_attendance(event_id: int, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Roll No", "Student Name", "Check In", "Check Out", "Duration (Mins)", "Status"])
    
    for log in logs:
        student = db.query(models.Student).filter(models.Student.roll_no == log.roll_no).first()
        writer.writerow([
            log.roll_no,
            student.name if student else "Unknown",
            log.check_in_time,
            log.check_out_time,
            f"{log.duration_minutes:.2f}" if log.duration_minutes else "0",
            log.status
        ])
    
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=attendance_{event_id}.csv"
    return response
