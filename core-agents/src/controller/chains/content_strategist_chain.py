from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain.callbacks import get_openai_callback

from ..constants.ai_models import OpenAIModel
from ..promtps.content_strategist_prompt import CONTENT_STRATEGIST_PROMPT
from ...model.agents import WeeklyContentStrategy


def content_strategist_agent(state):
    print("--- CONTENT STRATEGIST AGENT ---")
    
    state_dict = state["keys"]
    topic_context = state_dict["topic_context"]
    
    llm = ChatOpenAI(
        model_name=OpenAIModel.GPT_4_OMNI_MINI.value, 
        temperature=0, 
        streaming=False
    )
    
    parser = JsonOutputParser(pydantic_object=WeeklyContentStrategy)
    
    chain = CONTENT_STRATEGIST_PROMPT(
        format_instructions=parser.get_format_instructions
    ) | llm | parser
    
    with get_openai_callback() as cb:
        strategy = chain.invoke({"topic_context": topic_context})
        print(f"Strategist Tokens: {cb.total_tokens}")
    
    print("weekly_strategie: ", strategy)
    
    return {
        "keys": {
            "topic_context": topic_context,
            "weekly_strategy": strategy,
            "tokens_used": {
                "strategist": cb.total_tokens
            }
        }
    }


