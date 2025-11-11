from langchain.prompts import PromptTemplate

def TWEET_GENERATOR_PROMPT(format_instructions):

    prompt_template = """
    Generate a Tweet Based on Newsletter Content

    Create a tweet inspired by the following newsletter content:

    <content>
    {newsletter_content}
    </content>

    Use the templates below for inspiration:
    <templates>
    {templates}
    </templates>

    Please generate 12 tweet posts by following these instructions:
    {format_instructions}
    """

    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["newsletter_content","templates"],
        partial_variables={"format_instructions": format_instructions}
    )

    return PROMPT
