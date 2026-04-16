from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .db import get_db, User, APIKey, WorkflowConfig, Dataset
from .auth import authenticate_user
from .api_key_middleware import api_key_required
from fastapi.middleware.cors import CORSMiddleware
from backend.auth_routes import router as auth_router

app = FastAPI(title="Vault-Flows Core API", version="1.0.0")

# Security, allow cross origin for decoupled frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"status": "VaultFlows API is online running Phase 4."}

@app.get("/workflows", dependencies=[Depends(api_key_required)])
def list_workflows(db: Session = Depends(get_db)):
    return {"workflows": []}

@app.post("/training/lora", dependencies=[Depends(api_key_required)])
def trigger_lora_training():
    # TODO: Safe defaults enforced, notify via email when done
    return {"status": "Queued"}
