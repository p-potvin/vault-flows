from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.db import get_db, User
from passlib.context import CryptContext
from typing import Dict
import time

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory rate limiting to mitigate brute-force attacks on login
FAILED_LOGIN_ATTEMPTS: Dict[str, list] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIME_SECONDS = 300

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    
    class Config:
        from_attributes = True

@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login")
def login(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    current_time = time.time()

    # Clean up old attempts for this IP
    if ip in FAILED_LOGIN_ATTEMPTS:
        FAILED_LOGIN_ATTEMPTS[ip] = [t for t in FAILED_LOGIN_ATTEMPTS[ip] if current_time - t < LOCKOUT_TIME_SECONDS]
        if len(FAILED_LOGIN_ATTEMPTS[ip]) >= MAX_FAILED_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again later.")

    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        # Prevent timing attacks by running a dummy verification
        pwd_context.dummy_verify()
        password_matches = False
    else:
        password_matches = pwd_context.verify(user.password, db_user.hashed_password)

    if not password_matches:
        # Record failed attempt
        if ip not in FAILED_LOGIN_ATTEMPTS:
            FAILED_LOGIN_ATTEMPTS[ip] = []
        FAILED_LOGIN_ATTEMPTS[ip].append(current_time)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear attempts on successful login
    if ip in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[ip]

    # In a real app, generate a JWT token here.
    return {"message": "Login successful", "username": db_user.username}
