
from typing import TypedDict, Dict, Any, AsyncGenerator
import json

from langgraph.graph import END, StateGraph, START

from src.controller.chains.content_strategist_chain import content_strategist_agent
from src.controller.chains.tweet_creator_chain import tweet_creator_agent
from src.controller.chains.quality_optimizer_chain import quality_optimizer_agent

class AgentState(TypedDict):
    keys: Dict[str, Any]


async def supervisor_agent(topic_context: str):
    """
    Multi-agent system for generating weekly viral Twitter content.
    
    Flow:
    1. Content Strategist: Creates weekly strategy
    2. Tweet Creator: Generates tweets based on strategy
    3. Quality Optimizer: Refines and optimizes tweets
    
    Args:
        topic_context: The main topic or context for the weekly content
        
    Returns:
        Dict with optimized weekly tweets and strategy notes
    """
    
    # Build the graph with 3 agents
    graph_builder = StateGraph(AgentState)
    
    # Add nodes for each agent
    graph_builder.add_node("content_strategist", content_strategist_agent)
    graph_builder.add_node("tweet_creator", tweet_creator_agent)
    graph_builder.add_node("quality_optimizer", quality_optimizer_agent)
    
    # Define the flow: Strategist -> Creator -> Optimizer -> END
    graph_builder.add_edge(START, "content_strategist")
    graph_builder.add_edge("content_strategist", "tweet_creator")
    graph_builder.add_edge("tweet_creator", "quality_optimizer")
    graph_builder.add_edge("quality_optimizer", END)
    
    # Compile the graph
    graph = graph_builder.compile()
    
    # Execute the workflow
    final_state = await graph.ainvoke({
        "keys": {
            "topic_context": topic_context
        }
    })
    
    response = final_state["keys"]["response"]
    
    return response


async def supervisor_agent_stream(topic_context: str) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Streaming version of supervisor agent that emits events during execution.
    
    This allows the frontend to synchronize animations with the actual agent execution.
    
    Yields:
        Events with structure:
        - {"event": "workflow_started", "topic": str}
        - {"event": "agent_started", "agent": str, "name": str}
        - {"event": "agent_completed", "agent": str, "name": str}
        - {"event": "final_result", "data": dict}
        - {"event": "error", "message": str}
    """
    try:
        # Emit workflow started event
        yield {
            "event": "workflow_started",
            "topic": topic_context
        }
        
        # Build the graph with 3 agents
        graph_builder = StateGraph(AgentState)
        
        # Agent mapping for frontend synchronization
        agent_info = {
            "content_strategist": {"agent": "strategist", "name": "Content Strategist"},
            "tweet_creator": {"agent": "creator", "name": "Tweet Creator"},
            "quality_optimizer": {"agent": "optimizer", "name": "Quality Optimizer"}
        }
        
        # Add nodes for each agent
        graph_builder.add_node("content_strategist", content_strategist_agent)
        graph_builder.add_node("tweet_creator", tweet_creator_agent)
        graph_builder.add_node("quality_optimizer", quality_optimizer_agent)
        
        # Define the flow: Strategist -> Creator -> Optimizer -> END
        graph_builder.add_edge(START, "content_strategist")
        graph_builder.add_edge("content_strategist", "tweet_creator")
        graph_builder.add_edge("tweet_creator", "quality_optimizer")
        graph_builder.add_edge("quality_optimizer", END)
        
        # Compile the graph
        graph = graph_builder.compile()
        
        # Execute the workflow with streaming (only once!)
        current_node = None
        final_state = None
        
        async for chunk in graph.astream({
            "keys": {
                "topic_context": topic_context
            }
        }):
            # LangGraph streams chunks as {node_name: result}
            node_name = list(chunk.keys())[0] if chunk else None
            
            if node_name and node_name in agent_info:
                # If we're entering a new node, emit started event
                if current_node != node_name:
                    if current_node:
                        # Complete previous agent
                        info = agent_info[current_node]
                        yield {
                            "event": "agent_completed",
                            "agent": info["agent"],
                            "name": info["name"]
                        }
                    
                    # Start new agent
                    info = agent_info[node_name]
                    yield {
                        "event": "agent_started",
                        "agent": info["agent"],
                        "name": info["name"]
                    }
                    current_node = node_name
            
            # Capture the final state from the stream
            final_state = chunk
        
        # Complete the last agent
        if current_node and current_node in agent_info:
            info = agent_info[current_node]
            yield {
                "event": "agent_completed",
                "agent": info["agent"],
                "name": info["name"]
            }
        
        # Extract response from the final streamed state
        # The last chunk contains the final node's output
        if final_state and current_node:
            response = final_state[current_node]["keys"]["response"]
        else:
            raise Exception("No final state received from workflow")
        
        # Emit final result
        yield {
            "event": "final_result",
            "data": response
        }
        
    except Exception as e:
        print(f"Error in supervisor_agent_stream: {e}")
        yield {
            "event": "error",
            "message": str(e)
        }

