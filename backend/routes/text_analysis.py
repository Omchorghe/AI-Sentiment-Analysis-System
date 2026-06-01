"""Text analysis route definitions."""

import csv
from io import StringIO

from fastapi import APIRouter, Body, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from models.text_analysis import BulkTextAnalysisResponse, SentimentSummary, TextAnalysisResult
from services.sentiment_service import SentimentService
from services.word_frequency_service import WordFrequencyService

router = APIRouter(prefix="/api/v1/text", tags=["text-analysis"])

ALLOWED_EXTENSIONS = {".txt", ".csv"}


def _extract_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return f".{filename.rsplit('.', 1)[-1].lower()}"


def _parse_lines(file_content: str, extension: str) -> list[str]:
    if extension == ".txt":
        return [line.strip() for line in file_content.splitlines() if line.strip()]

    if extension == ".csv":
        csv_reader = csv.reader(StringIO(file_content))
        lines: list[str] = []
        for row in csv_reader:
            row_text = " ".join(cell.strip() for cell in row if cell.strip())
            if row_text:
                lines.append(row_text)
        return lines

    return []


def _process_text_list(lines: list[str]) -> BulkTextAnalysisResponse:
    """Process a list of text lines and return comprehensive analysis."""
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid text lines found.",
        )

    results: list[TextAnalysisResult] = []
    cleaned_texts: list[str] = []
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}

    for index, line in enumerate(lines, start=1):
        analysis = SentimentService.analyze_text(line)
        cleaned_text = str(analysis["cleaned_text"])
        sentiment = str(analysis["sentiment"])
        
        results.append(
            TextAnalysisResult(
                line_number=index,
                original_text=line,
                cleaned_text=cleaned_text,
                vader_score=float(analysis["vader_score"]),
                textblob_score=float(analysis["textblob_score"]),
                sentiment=sentiment,
                confidence=float(analysis["confidence"]),
            )
        )
        
        cleaned_texts.append(cleaned_text)
        sentiment_counts[sentiment] += 1

    # Generate summary
    summary = SentimentSummary(
        total=len(results),
        positive=sentiment_counts["positive"],
        negative=sentiment_counts["negative"],
        neutral=sentiment_counts["neutral"],
    )

    # Extract top words
    top_words = WordFrequencyService.get_top_words(cleaned_texts, limit=10)

    return BulkTextAnalysisResponse(
        results=results,
        summary=summary,
        top_words=top_words,
    )


@router.post("/analyze-raw", response_model=BulkTextAnalysisResponse)
async def analyze_raw_text(body: dict = Body(...)) -> BulkTextAnalysisResponse:
    """Analyze raw text input (newline-separated)."""
    if "text" not in body or not isinstance(body["text"], str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain 'text' field as a string.",
        )

    text_input = body["text"].strip()
    if not text_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input cannot be empty.",
        )

    lines = [line.strip() for line in text_input.splitlines() if line.strip()]
    return _process_text_list(lines)


@router.post("/analyze", response_model=BulkTextAnalysisResponse)
async def analyze_uploaded_text(file: UploadFile = File(...)) -> BulkTextAnalysisResponse:
    """Analyze sentiment from an uploaded TXT or CSV file."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    extension = _extract_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt and .csv files are supported.",
        )

    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded text.",
        ) from exc

    lines = _parse_lines(content, extension)
    return _process_text_list(lines)


@router.post("/export")
async def export_analysis_data(body: dict = Body(...)):
    """Export analyzed text results as a CSV file."""
    if "data" not in body or not isinstance(body["data"], list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain 'data' field as a list.",
        )

    results = body["data"]
    if not results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export empty data.",
        )

    # Create CSV output
    output = StringIO()
    fieldnames = ["original_text", "cleaned_text", "sentiment", "confidence", "vader_score", "textblob_score"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)

    writer.writeheader()
    for result in results:
        writer.writerow(
            {
                "original_text": result.get("original_text", ""),
                "cleaned_text": result.get("cleaned_text", ""),
                "sentiment": result.get("sentiment", ""),
                "confidence": result.get("confidence", ""),
                "vader_score": result.get("vader_score", ""),
                "textblob_score": result.get("textblob_score", ""),
            }
        )

    # Return as streaming response with proper headers
    csv_content = output.getvalue()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analysis.csv"},
    )
