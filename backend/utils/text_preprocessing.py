"""Text preprocessing utilities for NLP pipelines."""

import re


def preprocess_text(text: str) -> str:
    """
    Clean social text for downstream sentiment analysis.

    Steps:
    - remove URLs
    - remove mentions and hashtags
    - lowercase text
    - remove special characters
    - normalize extra whitespace
    """
    if not text:
        return ""

    cleaned = text.strip()
    cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)
    cleaned = re.sub(r"[@#]\w+", " ", cleaned)
    cleaned = cleaned.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned
