from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain.callbacks import get_openai_callback
import json

from ..constants.ai_models import OpenAIModel
from ..promtps.tweet_creator_prompt import TWEET_CREATOR_PROMPT
from ...model.agents import WeeklyTweetsPlan


def tweet_creator_agent(state):
    print("--- TWEET CREATOR AGENT ---")
    
    state_dict = state["keys"]
    topic_context = state_dict["topic_context"]
    weekly_strategy = state_dict["weekly_strategy"]
    
    # Convert strategy to string for prompt
    strategy_str = json.dumps(weekly_strategy, indent=2)
    
    llm = ChatOpenAI(
        model_name=OpenAIModel.GPT_4_OMNI_MINI.value, 
        temperature=0,  # Higher temp for creativity
        streaming=False
    )
    
    parser = JsonOutputParser(pydantic_object=WeeklyTweetsPlan)
    
    chain = TWEET_CREATOR_PROMPT(
        format_instructions=parser.get_format_instructions
    ) | llm | parser
    
    with get_openai_callback() as cb:
        tweets_plan = chain.invoke({
            "weekly_strategy": strategy_str,
            "topic_context": topic_context
        })
        print(f"Creator Tokens: {cb.total_tokens}")
    
    tokens_used = state_dict.get("tokens_used", {})
    tokens_used["creator"] = cb.total_tokens
    
    return {
        "keys": {
            "topic_context": topic_context,
            "weekly_strategy": weekly_strategy,
            "generated_tweets": tweets_plan,
            "tokens_used": tokens_used
        }
    }


