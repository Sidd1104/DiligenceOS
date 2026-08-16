"""
DiligenceOS API — Voyage AI Embeddings Service.

Uses Voyage AI's `voyage-finance-2` model (1024 dimensions) to generate vector embeddings.
Includes a deterministic 1024-dimension fallback generator for offline dev & unit tests.
"""

import hashlib
import logging
from typing import List

import httpx

from app.config import settings

logger = logging.getLogger("diligenceos.embeddings")

VOYAGE_EMBEDDING_MODEL = "voyage-finance-2"
EMBEDDING_DIMENSIONS = 1024


def generate_fallback_embedding(text: str) -> List[float]:
    """
    Generates a deterministic, normalized 1024-dimension pseudo-embedding vector
    from input text hash for offline dev & testing without live API keys.
    """
    text_bytes = text.encode("utf-8")
    hash_obj = hashlib.sha256(text_bytes).digest()

    # Generate 1024 floats derived deterministically from hash bytes
    vector: List[float] = []
    for i in range(EMBEDDING_DIMENSIONS):
        byte_val = hash_obj[(i * 3 + (i % 7)) % len(hash_obj)]
        val = (float(byte_val) / 255.0) - 0.5
        vector.append(round(val, 6))

    # Normalize vector to unit length
    magnitude = sum(x * x for x in vector) ** 0.5
    if magnitude > 0:
        vector = [round(x / magnitude, 6) for x in vector]

    return vector


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates 1024-dimension embeddings for a list of text strings
    using Voyage AI `voyage-finance-2` model.

    Batches input texts into requests of up to 32 items.
    Returns list of 1024-float embedding vectors.
    """
    if not texts:
        return []

    api_key = settings.voyage_api_key

    # If API key is unset or placeholder in local dev/test environment
    if not api_key or api_key.startswith("your-"):
        logger.info(
            f"VOYAGE_API_KEY is unset or placeholder. Using deterministic 1024-dim fallback vectors for {len(texts)} chunks."
        )
        return [generate_fallback_embedding(t) for t in texts]

    embeddings: List[List[float]] = []
    batch_size = 32

    # Process in batches
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(
                    "https://api.voyageai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": batch_texts,
                        "model": VOYAGE_EMBEDDING_MODEL,
                    },
                )
                res.raise_for_status()
                data = res.json()
                batch_embeddings = [item["embedding"] for item in data["data"]]
                embeddings.extend(batch_embeddings)
        except Exception as err:
            logger.error(f"Voyage AI embeddings API call failed: {err}. Falling back to deterministic vectors.")
            # Fallback on API call error
            fallback_batch = [generate_fallback_embedding(t) for t in batch_texts]
            embeddings.extend(fallback_batch)

    return embeddings
