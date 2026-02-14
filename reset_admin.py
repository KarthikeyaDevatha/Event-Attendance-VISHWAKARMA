from server_python import database, models
from sqlalchemy.orm import Session
import bcrypt

# Initialize DB
database.Base.metadata.create_all(bind=database.engine)
db = database.SessionLocal()

def reset_admin():
    username = "admin"
    password = "admin123"
    
    print(f"Checking for user: {username}")
    admin = db.query(models.Admin).filter(models.Admin.username == username).first()
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if admin:
        print(f"User found. ID: {admin.id}")
        print("Resetting password...")
        admin.password_hash = hashed
    else:
        print("User NOT found. Creating new admin...")
        new_admin = models.Admin(username=username, password_hash=hashed)
        db.add(new_admin)
    
    db.commit()
    print(f"✅ Admin user '{username}' configured with password '{password}'")
    db.close()

if __name__ == "__main__":
    reset_admin()
