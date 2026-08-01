from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies.auth import require_admin
from app.models.user import User
from app.services import import_jobs

router = APIRouter(prefix="/admin", tags=["admin"])


class ImportStartRequest(BaseModel):
    mode: str
    phase: str = "AB"
    confirm: str | None = None


@router.post("/import/start")
def start_import(body: ImportStartRequest, user: User = Depends(require_admin)):
    try:
        return import_jobs.start(body.mode, body.phase, body.confirm)
    except import_jobs.JobRunningError:
        raise HTTPException(status_code=409, detail="An import job is already running")
    except import_jobs.InvalidConfirm:
        raise HTTPException(status_code=400, detail="Confirmation phrase does not match")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/stop")
def stop_import(user: User = Depends(require_admin)):
    return import_jobs.stop()


@router.get("/import/status")
def import_status(user: User = Depends(require_admin)):
    return import_jobs.status()


@router.get("/import/info")
def import_info(user: User = Depends(require_admin)):
    return import_jobs.info()
