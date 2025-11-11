
from typing import TypedDict, Dict, Any

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

