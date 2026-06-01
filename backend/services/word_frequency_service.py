"""Service for extracting and analyzing word frequencies."""

from collections import Counter
from typing import Any


class WordFrequencyService:
    """Handles word frequency extraction and filtering."""

    # Common English stopwords
    STOPWORDS = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
        "the", "to", "was", "will", "with", "would", "you", "your",
        "this", "but", "not", "can", "have", "i", "me", "my", "we",
        "they", "them", "their", "which", "who", "what", "where", "when",
        "why", "how", "all", "each", "every", "both", "few", "more",
        "most", "some", "such", "no", "nor", "only", "same", "so",
        "than", "too", "very", "just", "should", "now", "do", "does",
        "did", "doing", "been", "being", "am", "had", "having", "if",
        "because", "before", "after", "above", "below", "between",
        "into", "through", "during", "while", "off", "out", "over",
        "under", "again", "further", "then", "once", "here", "there",
        "about", "up", "down", "any", "our", "ours", "his", "hers",
        "its", "theirs", "herself", "himself", "itself", "myself",
        "ourselves", "yourself", "yourselves", "themselves"
    }

    @staticmethod
    def extract_words(text: str) -> list[str]:
        """Extract individual words from text."""
        # Split by whitespace and punctuation
        words = text.lower().split()
        return words

    @classmethod
    def get_top_words(cls, texts: list[str], limit: int = 10) -> list[dict[str, Any]]:
        """
        Extract top N most frequent words from a list of texts.

        Removes stopwords and returns sorted list of dicts with word and count.
        """
        all_words: list[str] = []
        
        for text in texts:
            words = cls.extract_words(text)
            # Filter stopwords
            filtered = [w for w in words if w and w not in cls.STOPWORDS]
            all_words.extend(filtered)

        if not all_words:
            return []

        # Count frequencies
        word_counts = Counter(all_words)
        top_words = word_counts.most_common(limit)

        return [{"word": word, "count": count} for word, count in top_words]
