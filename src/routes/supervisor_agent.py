from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from src.controller.agents.supervisor_agent import weekly_content_supervisor
from src.model.routes import WeeklyContentRequest

router = APIRouter()

@router.post("/weekly-content-generator/")
async def generate_weekly_content(request: WeeklyContentRequest):
    """
    Generate viral Twitter content for a full week based on a given topic.
    
    This endpoint uses a multi-agent system:
    - Content Strategist: Plans the weekly content strategy
    - Tweet Creator: Generates viral tweets for each day
    - Quality Optimizer: Refines and optimizes all content
    
    Returns 14-21 optimized tweets (2-3 per day) ready to post.
    """
    try:
        response = await weekly_content_supervisor(request.topic_context)
        return {
            "success": True,
            "data": response
        }
    except ValidationError as e:
        print("Validation error:", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print("Exception:", e)
        raise HTTPException(status_code=500, detail=str(e))
