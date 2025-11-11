from langchain.prompts import PromptTemplate

def QUALITY_OPTIMIZER_PROMPT(format_instructions):
    prompt_template = """
    You are a Twitter Engagement Optimization Expert. Your role is to review and enhance tweets for maximum viral potential.
    
    Review these generated tweets:
    
    <tweets>
    {generated_tweets}
    </tweets>
    
    Original topic context:
    <context>
    {topic_context}
    </context>
    
    Analyze and optimize each tweet by:
    
    1. **Hook Optimization**: Ensure the first 10 words grab attention
    2. **Clarity**: Make sure the message is crystal clear
    3. **Emotion**: Add emotional triggers (curiosity, surprise, inspiration)
    4. **Formatting**: Use line breaks, emojis (sparingly), and whitespace effectively
    5. **CTA Strength**: Ensure calls-to-action are compelling
    6. **Hashtag Balance**: Not too many, not too few (2-3 max)
    7. **Variety Check**: Ensure good variety across the week
    8. **Engagement Score**: Rate each tweet's viral potential (1-10)
    
    Remove or improve any tweets that:
    - Sound too salesy or promotional
    - Are too generic or boring
    - Don't fit the brand voice
    - Have poor hooks
    
    Provide the final optimized set of tweets ready to post, along with:
    - Overall strategy notes
    - Best practices for posting times
    - Engagement maximization tips
    
    {format_instructions}
    """
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["generated_tweets", "topic_context"],
        partial_variables={"format_instructions": format_instructions}
    )
    
    return PROMPT


