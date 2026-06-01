"""Schema models for text sentiment analysis."""

from pydantic import BaseModel


class TextAnalysisResult(BaseModel):
    """Sentiment analysis output for one input line."""

    line_number: int
    original_text: str
    cleaned_text: str
    vader_score: float
    textblob_score: float
    sentiment: str
    confidence: float


class SentimentSummary(BaseModel):
    """Summary statistics for sentiment distribution."""

    total: int
    positive: int
    negative: int
    neutral: int


class WordFrequency(BaseModel):
    """Word frequency entry."""

    word: str
    count: int


class BulkTextAnalysisResponse(BaseModel):
    """Response for bulk text analysis with aggregated statistics."""

    results: list[TextAnalysisResult]
    summary: SentimentSummary
    top_words: list[WordFrequency]
