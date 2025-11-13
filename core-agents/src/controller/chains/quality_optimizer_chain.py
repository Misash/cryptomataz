from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain.callbacks import get_openai_callback
import json

from ..constants.ai_models import OpenAIModel
from ..promtps.quality_optimizer_prompt import QUALITY_OPTIMIZER_PROMPT
from ...model.agents import OptimizedWeeklyContent


def quality_optimizer_agent(state):
    print("--- QUALITY OPTIMIZER AGENT ---")
    
    state_dict = state["keys"]
    topic_context = state_dict["topic_context"]
    generated_tweets = state_dict["generated_tweets"]
    
    # Convert tweets to string for prompt
    tweets_str = json.dumps(generated_tweets, indent=2)
    
    llm = ChatOpenAI(
        model_name=OpenAIModel.GPT_4_OMNI_MINI.value, 
        temperature=0.5,  # Balanced for optimization
        streaming=False
    )
    
    parser = JsonOutputParser(pydantic_object=OptimizedWeeklyContent)
    
    chain = QUALITY_OPTIMIZER_PROMPT(
        format_instructions=parser.get_format_instructions
    ) | llm | parser
    
    with get_openai_callback() as cb:
        optimized_content = chain.invoke({
            "generated_tweets": tweets_str,
            "topic_context": topic_context
        })
        print(f"Optimizer Tokens: {cb.total_tokens}")
        print(f"Optimized content: {optimized_content}")
    
    tokens_used = state_dict.get("tokens_used", {})
    tokens_used["optimizer"] = cb.total_tokens
    tokens_used["total"] = sum(tokens_used.values())
    
    # Extract tweets - handle both dict and object access
    if isinstance(optimized_content, dict):
        tweets = optimized_content.get("weekly_tweets", [])
        tips = optimized_content.get("key_tips", "")
    else:
        tweets = optimized_content.weekly_tweets
        tips = optimized_content.key_tips
    
    return {
        "keys": {
            "response": {
                "tweets": tweets,
                "tips": tips,
                "models": {
                    "chat": {
                        "model": OpenAIModel.GPT_4_OMNI_MINI.value,
                        "tokens": tokens_used
                    }
                }
            }
        }
    }

