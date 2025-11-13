from langchain.prompts import PromptTemplate

def CONTENT_STRATEGIST_PROMPT(format_instructions):
    prompt_template = """
    You are a Twitter Content Strategist. Keep it simple and direct.
    
    Topic: {topic_context}
    
    Provide:
    1. Main topic (one sentence)
    2. Target audience (one sentence)
    3. Three different content angles to explore this topic
    
    Be concise and actionable.
    
    {format_instructions}
    """
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["topic_context"],
        partial_variables={"format_instructions": format_instructions}
    )
    
    return PROMPT


