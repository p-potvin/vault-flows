from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db, APIKey
import secrets
import hashlib

def hash_api_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()

def api_key_required(x_api_key: str = Header(None), db: Session = Depends(get_db)):
    if x_api_key is None:
        raise HTTPException(status_code=401, detail="API Key header missing")
    
    # Secure comparison: Hash the input and look up in the database.
    # This prevents storing raw keys and provides protection against simple leaks.
    # We use secrets.compare_digest for the final verification.
    input_hash = hash_api_key(x_api_key)
    key_entry = db.query(APIKey).filter(APIKey.key_hash == input_hash).first()

    if not key_entry or not secrets.compare_digest(key_entry.key_hash, input_hash):
        raise HTTPException(status_code=403, detail="Could not validate API key")
    
    return key_entry

def generate_api_key():
    return secrets.token_urlsafe(32)
