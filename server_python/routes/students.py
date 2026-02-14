from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.post("/", response_model=schemas.StudentCreate)
def create_student(student: schemas.StudentCreate, db: Session = Depends(database.get_db)):
    clean_roll_no = student.roll_no.strip().upper()
    existing = db.query(models.Student).filter(models.Student.roll_no == clean_roll_no).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Student with roll number {clean_roll_no} already exists")
    
    new_student = models.Student(
        roll_no=clean_roll_no,
        name=student.name.strip(),
        department=student.department,
        year=student.year
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/", response_model=List[schemas.StudentCreate])
def list_students(db: Session = Depends(database.get_db)):
    return db.query(models.Student).all()
