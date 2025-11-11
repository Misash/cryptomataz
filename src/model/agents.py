from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

class Tweet(BaseModel):
    tweet: str = Field(description="Tweet Post")
    type: str = Field(description="Field of Personal, Growth or Authority")

# MODELS FOR WEEKLY CONTENT GENERATION

class DailyStrategy(BaseModel):
    day: str = Field(description="Day of the week (Monday, Tuesday, etc.)")
    theme: str = Field(description="Main theme for the day")
    hook_angle: str = Field(description="Hook or angle to capture attention")
    content_type: str = Field(description="Type of content (Educational, Inspirational, Story, Thread, etc.)")
    hashtags: List[str] = Field(description="Relevant hashtags for the day")

class WeeklyContentStrategy(BaseModel):
    main_topic: str = Field(description="Main topic for the week")
    target_audience: str = Field(description="Target audience description")
    daily_strategies: List[DailyStrategy] = Field(description="Strategy for each day of the week")

class DailyTweet(BaseModel):
    day: str = Field(description="Day of the week")
    tweet_text: str = Field(description="Tweet content")
    hook: str = Field(description="Opening hook")
    cta: str = Field(description="Call to action")
    engagement_score: int = Field(description="Estimated engagement score (1-10)")
    hashtags: List[str] = Field(description="Hashtags to use")

class WeeklyTweetsPlan(BaseModel):
    tweets: List[DailyTweet] = Field(description="List of tweets for the week (2-3 per day)")
    
class OptimizedWeeklyContent(BaseModel):
    weekly_tweets: List[DailyTweet] = Field(description="Optimized tweets for the week")
    overall_strategy_notes: str = Field(description="Notes about the overall weekly strategy")
    engagement_tips: List[str] = Field(description="Tips to maximize engagement")
