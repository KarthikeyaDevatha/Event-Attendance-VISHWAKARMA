from server_python import database, models
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

# Initialize DB
database.Base.metadata.create_all(bind=database.engine)
db = database.SessionLocal()

def seed():
    # 1. Create Event
    event = db.query(models.Event).first()
    if not event:
        print("Creating default event...")
        new_event = models.Event(
            title="Test Event",
            description="A test event for debugging",
            event_date=datetime.now().strftime("%Y-%m-%d"),
            start_time=datetime.now().isoformat(),
            end_time=(datetime.now() + timedelta(hours=2)).isoformat(),
            duration_minutes=120,
            session_token="test-token-123"
        )
        db.add(new_event)
        db.commit()
        print(f"Created Event ID: {new_event.id}")
    else:
        print(f"Event already exists: ID {event.id}")

    # 2. Create Default Admin
    admin_check = db.query(models.Admin).filter(models.Admin.username == "admin").first()
    if not admin_check:
        print("Creating default admin...")
        import bcrypt
        hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_admin = models.Admin(username="admin", password_hash=hashed)
        db.add(new_admin)
        db.commit()
    else:
        print("Admin already exists.")

    # 3. Create Student (from User's image)
    # The image shows "kdevatha@gitam.in". We'll assume that's the QR content or Roll No.
    # We also add a standard roll number just in case.
    students_to_add = [
        {"roll_no": "kdevatha@gitam.in", "name": "Karthikeya Devatha"},
        {"roll_no": "hU22CSN0100593", "name": "Sample Student"},
        {"roll_no": "HU22CSEN0100593", "name": "User ID Card"}, 
        {"roll_no": "1234567890", "name": "Test QR"}
    ]

    for s in students_to_add:
        exists = db.query(models.Student).filter(models.Student.roll_no == s["roll_no"]).first()
        if not exists:
            print(f"Creating student: {s['name']}")
            new_student = models.Student(
                roll_no=s["roll_no"],
                name=s["name"],
                department="CSE",
                year=3
            )
            db.add(new_student)
            db.commit()
        else:
            print(f"Student {s['name']} already exists.")

    print("Seeding complete! 🌱")
    db.close()

if __name__ == "__main__":
    seed()
