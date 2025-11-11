from pydantic import BaseModel, Field

class SupervisorAgentRequest(BaseModel):
    topic_context: str = Field(
        description="Main topic or theme for the weekly Twitter content",
        example="AI automation for small businesses"
    )