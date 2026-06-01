"""Schema models for Finance Pulse module."""

from typing import List

from pydantic import BaseModel, Field


class HistoricalPrice(BaseModel):
    """Daily historical price data point."""

    date: str
    open: float
    high: float
    low: float
    price: float
    sentiment_score: float = 0.0


class NewsArticle(BaseModel):
    """News article with sentiment classification."""

    headline: str
    url: str
    sentiment: str  # Bullish, Bearish, Neutral
    score: float


class FinancePulseResponse(BaseModel):
    """Response payload for Finance Pulse analysis."""

    ticker: str = Field(..., description="Stock ticker symbol")
    company_name: str = Field(..., description="Full Company Name")
    all_time_high: float = Field(0.0, description="All-Time High")
    all_time_low: float = Field(0.0, description="All-Time Low")
    average_price: float = Field(0.0, description="Average Price")
    ai_recommendation: str = Field(..., description="BUY, SELL, or HOLD recommendation")
    historical_prices: List[HistoricalPrice] = Field(
        default_factory=list, description="7-day daily closing prices"
    )
    news_feed: List[NewsArticle] = Field(
        default_factory=list, description="Top recent news headlines with sentiment"
    )
