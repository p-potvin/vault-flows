from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db, APIKey
import secrets

def api_key_required(x_api_key: str = Header(None), db: Session = Depends(get_db)):
    if x_api_key is None:
        raise HTTPException(status_code=401, detail="API Key header missing")
    
    # Hash the provided key and look it up (simplified logic for stub)
    # TODO: Implement secure hashing comparison (hashlib/secrets.compare_digest)
    key_entry = db.query(APIKey).filter(APIKey.key_hash == x_api_key).first()
    if not key_entry:
        raise HTTPException(status_code=403, detail="Could not validate API key")
    
    return key_entry

def generate_api_key():
    return secrets.token_urlsafe(32)