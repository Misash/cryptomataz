from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
import json
import asyncio

from src.controller.agents.supervisor_agent import supervisor_agent, supervisor_agent_stream
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
        print("-- Supervisor Endpoint --")
        print("topic_context:", request.topic_context)
        response = await supervisor_agent(request.topic_context)
        return {
            "data": response
        }
    except ValidationError as e:
        print("Validation error:", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print("Exception:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/supervisor-agent/stream")
async def supervisor_agent_stream_endpoint(request: SupervisorAgentRequest):
    """
    Streaming version of the supervisor agent endpoint.
    
    Emits Server-Sent Events (SSE) as each agent executes, allowing the frontend
    to synchronize animations with the actual backend execution.
    
    Events emitted:
    - workflow_started: When the workflow begins
    - agent_started: When an agent starts execution
    - agent_completed: When an agent finishes execution
    - final_result: Final optimized content
    - error: If an error occurs
    
    Use EventSource on the frontend to listen to these events.
    """
    async def event_generator():
        try:
            print("-- Supervisor Streaming Endpoint --")
            print("topic_context:", request.topic_context)
            
            # Stream events from the supervisor agent
            async for event in supervisor_agent_stream(request.topic_context):
                # Format as SSE (Server-Sent Events)
                event_data = json.dumps(event)
                yield f"data: {event_data}\n\n"
                
                # Small delay to ensure smooth streaming
                await asyncio.sleep(0.1)
                
        except ValidationError as e:
            print("Validation error:", e)
            error_event = json.dumps({
                "event": "error",
                "message": f"Validation error: {str(e)}"
            })
            yield f"data: {error_event}\n\n"
        except Exception as e:
            print("Exception:", e)
            error_event = json.dumps({
                "event": "error",
                "message": str(e)
            })
            yield f"data: {error_event}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        }
    )
