from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from src.controller.agents.supervisor_agent import supervisor_agent
from src.model.routes import SupervisorAgentRequest

router = APIRouter()

@router.post("/supervisor-agent/")
async def supervisor_agent_endpoint(request: SupervisorAgentRequest):
    """
    Generate viral Twitter content for a full week based on a given topic.
    
    This endpoint uses a multi-agent system:
    - Content Strategist: Plans the weekly content strategy
    - Tweet Creator: Generates viral tweets for each day
    - Quality Optimizer: Refines and optimizes all content
    
    Returns 14-21 optimized tweets (2-3 per day) ready to post.
    """
    try:
        response = await supervisor_agent(request.topic_context)
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
