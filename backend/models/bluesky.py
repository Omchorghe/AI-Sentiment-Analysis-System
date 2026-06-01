"""Schema models for Bluesky sentiment analysis."""

from pydantic import BaseModel, Field


class BlueskyAnalyzeRequest(BaseModel):
    """Request payload for Bluesky post sentiment analysis."""

    keyword: str = Field(min_length=1, description="Search keyword for Bluesky posts.")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum number of posts to fetch.")
