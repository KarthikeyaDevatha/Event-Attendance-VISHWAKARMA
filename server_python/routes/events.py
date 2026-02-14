from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
import uuid

router = APIRouter()

@router.post("/", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(database.get_db)):
    # session_token = str(uuid.uuid4())
    new_event = models.Event(
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        start_time=event.start_time,
        end_time=event.end_time,
        duration_minutes=event.duration_minutes,
        min_attendance_percent=event.min_attendance_percent,
        session_token=str(uuid.uuid4())
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.get("/", response_model=List[schemas.EventResponse])
def list_events(db: Session = Depends(database.get_db)):
    return db.query(models.Event).all()

@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.get("/{event_id}/stats")
def get_event_stats(event_id: int, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    total = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id).count()
    present = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id, models.AttendanceLog.status == "PRESENT").count()
    absent = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id, models.AttendanceLog.status == "ABSENT").count()
    pending = db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id, models.AttendanceLog.status == "PENDING").count()

    return {
        "event_id": event.id,
        "title": event.title,
        "total_scans": total,
        "present": present,
        "absent": absent,
        "pending": pending
    }

@router.post("/{event_id}/finalize")
def finalize_event(event_id: int, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Update pending to absent
    rows = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.event_id == event_id, 
        models.AttendanceLog.status == 'PENDING'
    ).update({models.AttendanceLog.status: 'ABSENT'}, synchronize_session=False)
    
    event.is_active = False
    db.commit()
    
    return {"message": f"Finalized. {rows} records marked as ABSENT.", "finalized_count": rows}

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete associated logs first
    db.query(models.AttendanceLog).filter(models.AttendanceLog.event_id == event_id).delete()
    
    # Delete the event
    db.delete(event)
    db.commit()
    
    return {"message": "Event and associated attendance logs deleted successfully"}
