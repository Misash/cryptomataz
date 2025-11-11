from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.output_parsers import JsonOutputParser
from langchain.callbacks import get_openai_callback

from ..constants.ai_models import OpenAIModel
from ..promtps.tweet_generator_prompt import TWEET_GENERATOR_PROMPT
from ...model.agents import TweetGeneratorResponse


def youtuber_agent(state):
    print("-- YOUTUBER AGENT ---")

    state_dict = state["keys"]
    newsletter_content = state_dict["newsletter_content"]
    templates = state_dict["templates"]
    embeddings = state_dict["embeddings"]
    
    llm = ChatOpenAI(model_name=OpenAIModel.GPT_4_OMNI_MINI.value, temperature=0, streaming=False)

    parser = JsonOutputParser(pydantic_object=TweetGeneratorResponse)

    chain = TWEET_GENERATOR_PROMPT(format_instructions=parser.get_format_instructions) | llm | parser

    with get_openai_callback() as cb:
        response = chain.invoke({"newsletter_content": newsletter_content, "templates": templates})
        print(cb)
    
    return { 
        "keys": { 
            "response": {
                "tweets": response["tweets"],
                "models" : {
                    "embeddings": embeddings,
                    "chat": {
                        "model": OpenAIModel.GPT_4_OMNI_MINI.value,
                        "tokens": cb.total_tokens
                    }
                }
            }
 
        }
    }

