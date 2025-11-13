from langchain.prompts import PromptTemplate

def TWEET_CREATOR_PROMPT(format_instructions):
    prompt_template = """
    You are a Twitter Content Creator. Create 5 engaging tweets.
    
    Strategy: {weekly_strategy}
    Topic: {topic_context}
    
    Generate 5 tweets (max 280 chars each):
    - Start with a strong hook
    - Provide clear value
    - Make them engaging and shareable
    - Mix types: educational, inspirational, entertaining
    
    Keep it punchy and direct.
    
    {format_instructions}
    """
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["weekly_strategy", "topic_context"],
        partial_variables={"format_instructions": format_instructions}
    )
    
    return PROMPT


