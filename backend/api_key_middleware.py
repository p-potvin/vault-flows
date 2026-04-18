from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db, APIKey
import secrets
import hashlib

def api_key_required(x_api_key: str = Header(None), db: Session = Depends(get_db)):
    if x_api_key is None:
        raise HTTPException(status_code=401, detail="API Key header missing")
    
    hashed_key = hashlib.sha256(x_api_key.encode()).hexdigest()
    key_entry = db.query(APIKey).filter(APIKey.key_hash == hashed_key).first()

    # Use compare_digest as a defense-in-depth measure against case-insensitive DB collations
    if not key_entry or not secrets.compare_digest(key_entry.key_hash, hashed_key):
        raise HTTPException(status_code=403, detail="Could not validate API key")
    
    return key_entry

def generate_api_key():
    return secrets.token_urlsafe(32)