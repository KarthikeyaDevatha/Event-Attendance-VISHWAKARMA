from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, database
import bcrypt
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    admin: dict

SECRET_KEY = "your-secret-key-keep-it-secret" # In prod, use env var
ALGORITHM = "HS256"

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(database.get_db)):
    # Find user
    admin = db.query(models.Admin).filter(models.Admin.username == request.username).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check password
    if not bcrypt.checkpw(request.password.encode('utf-8'), admin.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate Token
    expiration = datetime.utcnow() + timedelta(hours=24)
    token_data = {"sub": admin.username, "exp": expiration}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "token": token,
        "admin": {"id": admin.id, "username": admin.username}
    }

@router.get("/me")
def get_current_user(db: Session = Depends(database.get_db)):
    # Simplified auth check for now
    return {"admin": {"username": "admin"}}
