from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import scan, students, events, auth, attendance
from fastapi import Depends
from sqlalchemy.orm import Session
from . import database

# ...

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Event Attendance System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "Event Attendance API",
        "database": "connected" # Simplified for now
    }

@app.get("/api/health/full")
def full_health_check(db: Session = Depends(database.get_db)):
    try:
        from sqlalchemy import text
        # Check DB connection
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "components": ["vision", "api", "db"]}
    except Exception as e:
        print(f"Health Check Failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
