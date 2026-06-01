"""Schema models for YouTube sentiment analysis."""

from pydantic import BaseModel, Field


class YouTubeAnalyzeRequest(BaseModel):
    """Request payload for YouTube sentiment analysis."""

    url: str = Field(min_length=1, description="YouTube video URL.")

