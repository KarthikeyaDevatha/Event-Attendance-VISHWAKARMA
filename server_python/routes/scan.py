from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, schemas, database

router = APIRouter()

@router.post("/")
@router.post("")
def scan_qr(request: schemas.ScanRequest, db: Session = Depends(database.get_db)):
    # 1. Input Validation
    if not request.roll_no or not request.event_id:
        raise HTTPException(status_code=400, detail="roll_no and event_id are required")
    
    # Lyra Mode: Strict String Ingestion (No transformations)
    clean_roll_no = request.roll_no.strip().upper() 
    
    # 2. Check Event
    event = db.query(models.Event).filter(models.Event.id == request.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_active:
        raise HTTPException(status_code=400, detail="Event is no longer active")

    # 3. Check Student
    from sqlalchemy import func
    student = db.query(models.Student).filter(func.lower(models.Student.roll_no) == clean_roll_no.lower()).first()
    if not student:
        print(f"❌ Scan attempt failed: Student {clean_roll_no} not found")
        raise HTTPException(status_code=404, detail=f"No student registered with roll number: {clean_roll_no}")

    # 4. Check Existing Log
    log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.roll_no == clean_roll_no,
        models.AttendanceLog.event_id == request.event_id
    ).first()

    now = datetime.now()
    now_iso = now.isoformat()

    if not log:
        # === FIRST SCAN -> CHECK-IN ===
        new_log = models.AttendanceLog(
            roll_no=clean_roll_no,
            event_id=request.event_id,
            check_in_time=now_iso,
            status="PENDING"
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        
        return {
            "action": "CHECK_IN",
            "roll_no": clean_roll_no,
            "student_name": student.name,
            "check_in_time": now_iso,
            "message": f"✅ {student.name} checked in successfully"
        }
    
    else:
        # Check for rapid re-scan (Anti-Abuse)
        last_action_time = datetime.fromisoformat(log.check_out_time if log.check_out_time else log.check_in_time)
        time_diff = (now - last_action_time).total_seconds()
        
        if time_diff < 10: # 10 seconds cooldown
             print(f"Updates blocked: {time_diff}s since last scan")
             return {
                "action": "DUPLICATE_BLOCKED",
                "roll_no": clean_roll_no,
                "student_name": student.name,
                "status": log.status,
                "message": f"⏳ Please wait 10s before rescanning."
             }

        # === SECOND SCAN -> CHECK-OUT ===
        if log.check_out_time:
             # Already checked out - Update logic? 
             # For now, we allow updating checkout time ONLY if status is PENDING or ABSENT (re-evaluating)
             # But if PRESENT, we block.
             if log.status == "PRESENT":
                 return {
                    "action": "DUPLICATE_BLOCKED",
                    "roll_no": clean_roll_no,
                    "student_name": student.name,
                    "check_in_time": log.check_in_time,
                    "check_out_time": log.check_out_time,
                    "status": log.status,
                    "message": f"✅ {student.name} is already marked PRESENT."
                 }
        
        # Perform Check-out Calculation
        check_in_dt = datetime.fromisoformat(log.check_in_time)
        duration_minutes = (now - check_in_dt).total_seconds() / 60.0
        
        required_minutes = event.duration_minutes * (event.min_attendance_percent / 100.0)
        attendance_status = "PRESENT" if duration_minutes >= required_minutes else "ABSENT"
        
        # Prevent accidental rapid checkout (e.g. < 1 min)
        if duration_minutes < 1.0:
             return {
                "action": "EARLY_CHECKOUT_WARNING",
                "roll_no": clean_roll_no,
                "student_name": student.name,
                "message": f"⚠️ Too early to checkout! ({duration_minutes:.1f} min)"
             }

        log.check_out_time = now_iso
        log.duration_minutes = duration_minutes
        log.status = attendance_status
        
        db.commit()
        db.refresh(log)
        
        msg = f"✅ {student.name} — PRESENT ({duration_minutes:.1f} min)" if attendance_status == "PRESENT" else \
              f"❌ {student.name} — ABSENT ({duration_minutes:.1f} min < {required_minutes:.1f} min required)"

        return {
            "action": "CHECK_OUT",
            "roll_no": clean_roll_no,
            "student_name": student.name,
            "check_in_time": log.check_in_time,
            "check_out_time": now_iso,
            "duration_minutes": duration_minutes,
            "status": attendance_status,
            "message": msg
        }
