from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

class Tweet(BaseModel):
    tweet: str = Field(description="Tweet Post")
    type: str = Field(description="Field of Personal, Growth or Authority")

# MODELS FOR WEEKLY CONTENT GENERATION

class WeeklyContentStrategy(BaseModel):
    """Simplified strategy - just 3 core content angles"""
    main_topic: str = Field(description="Main topic")
    target_audience: str = Field(description="Who this content is for")
    content_angles: List[str] = Field(description="3 different angles to approach the topic")

class SimpleTweet(BaseModel):
    """Simplified tweet - just the essentials"""
    tweet_text: str = Field(description="Complete tweet content (max 280 chars)")
    content_type: str = Field(description="Type: educational, inspirational, or entertaining")

class WeeklyTweetsPlan(BaseModel):
    """Just 5 quality tweets instead of 14-21"""
    tweets: List[SimpleTweet] = Field(description="5 high-quality tweets ready to post")
    
class OptimizedWeeklyContent(BaseModel):
    """Simplified output - just the best tweets and key tips"""
    weekly_tweets: List[SimpleTweet] = Field(description="5 optimized, ready-to-post tweets")
    key_tips: str = Field(description="One paragraph with the most important engagement tips")
