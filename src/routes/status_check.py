from datetime import datetime

from fastapi import APIRouter

router = APIRouter()

@router.get("/status-check")
async def healthcheck():
    return {
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "api_eduv_AI_version": "0.0.1.5",
    }
