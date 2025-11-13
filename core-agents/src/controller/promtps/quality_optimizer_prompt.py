from langchain.prompts import PromptTemplate

def QUALITY_OPTIMIZER_PROMPT(format_instructions):
    prompt_template = """
    You are a Twitter Optimizer. Polish these tweets and make them better.
    
    Tweets to optimize: {generated_tweets}
    
    Topic: {topic_context}
    
    Improve each tweet:
    - Stronger hooks
    - Better formatting
    - More engaging
    - Clear and concise
    
    Return 5 polished tweets and one paragraph with key posting tips.
    
    {format_instructions}
    """
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["generated_tweets", "topic_context"],
        partial_variables={"format_instructions": format_instructions}
    )
    
    return PROMPT


