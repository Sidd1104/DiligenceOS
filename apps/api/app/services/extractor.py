"""
DiligenceOS API — PDF Extractor & Semantic Chunker.

Uses PyMuPDF (fitz) for page-accurate text extraction (REQ-PROC-01)
and semantic paragraph chunking with section title detection (REQ-PROC-02).
"""

import logging
import re
from typing import List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger("diligenceos.extractor")

# Section heading regex pattern (best-effort detection)
HEADING_PATTERN = re.compile(
    r"^(?:ITEM\s+\d+[A-Z]?|SECTION\s+\d+|PART\s+[I|V|X\d]+|\d+\.\d*\s+[A-Z]|[A-Z0-9\s\-\:\,]{3,75})$",
    re.IGNORECASE,
)


def extract_pdf_pages(pdf_bytes: bytes) -> Tuple[int, List[dict]]:
    """
    Extracts text page-by-page from raw PDF bytes using PyMuPDF.

    Returns (page_count, pages_data) where pages_data is:
    [{"page_number": 1, "text": "..."}, ...]

    Raises ValueError if the PDF contains zero extractable text (e.g. scanned/image-only PDF).
    """
    if not pdf_bytes:
        raise ValueError("Cannot extract text from empty PDF bytes.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as err:
        raise ValueError(f"Failed to open PDF document: {err}")

    page_count = len(doc)
    if page_count == 0:
        raise ValueError("PDF document has 0 pages.")

    pages_data: List[dict] = []
    total_text_length = 0

    for page_idx in range(page_count):
        page = doc[page_idx]
        page_number = page_idx + 1  # 1-indexed
        text = page.get_text("text") or ""
        text_cleaned = text.strip()

        total_text_length += len(text_cleaned)
        pages_data.append(
            {
                "page_number": page_number,
                "text": text_cleaned,
            }
        )

    doc.close()

    # Reject scanned or unreadable image-only PDFs
    if total_text_length < 20:
        raise ValueError("Could not extract text — the PDF may be scanned/image-based or unreadable")

    return page_count, pages_data


def is_likely_heading(line: str) -> bool:
    """Best-effort check if a line is a section heading."""
    line_clean = line.strip()
    if not line_clean or len(line_clean) > 80:
        return False
    if line_clean.endswith(".") or line_clean.endswith(",") or line_clean.endswith(";"):
        return False
    if line_clean.isupper() and len(line_clean) >= 4:
        return True
    if HEADING_PATTERN.match(line_clean):
        return True
    return False


def chunk_pages(
    pages_data: List[dict],
    target_tokens: int = 600,
    max_tokens: int = 1000,
) -> List[dict]:
    """
    Groups page text by paragraphs into semantic chunks (~500-800 tokens).

    Preserves `page_number` for each chunk, detects `section_title` (best-effort),
    and keeps paragraphs intact without splitting mid-sentence across chunks.

    Returns list of chunk objects:
    [{
        "chunk_index": 0,
        "page_number": 1,
        "section_title": "EXECUTIVE SUMMARY",
        "text": "...",
        "token_count": 450
    }, ...]
    """
    chunks: List[dict] = []
    current_section_title: Optional[str] = None
    chunk_index = 0

    for page_info in pages_data:
        page_number = page_info["page_number"]
        page_text = page_info["text"]

        if not page_text:
            continue

        # Split page text into paragraphs by double newlines or blank lines
        raw_paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]

        current_chunk_paragraphs: List[str] = []
        current_chunk_tokens = 0

        for para in raw_paragraphs:
            lines = [l.strip() for l in para.split("\n") if l.strip()]
            first_line = lines[0] if lines else ""

            # Detect section heading
            if len(lines) == 1 and is_likely_heading(first_line):
                current_section_title = first_line

            para_tokens = len(para.split())

            # If adding this paragraph exceeds target_tokens and we already have content, finalize chunk
            if current_chunk_paragraphs and (current_chunk_tokens + para_tokens > target_tokens):
                chunk_text = "\n\n".join(current_chunk_paragraphs)
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "section_title": current_section_title,
                        "text": chunk_text,
                        "token_count": current_chunk_tokens,
                    }
                )
                chunk_index += 1
                current_chunk_paragraphs = []
                current_chunk_tokens = 0

            # If a single paragraph is larger than max_tokens, add it as its own chunk
            if para_tokens > max_tokens:
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "section_title": current_section_title,
                        "text": para,
                        "token_count": para_tokens,
                    }
                )
                chunk_index += 1
            else:
                current_chunk_paragraphs.append(para)
                current_chunk_tokens += para_tokens

        # Flush remaining paragraphs for the page
        if current_chunk_paragraphs:
            chunk_text = "\n\n".join(current_chunk_paragraphs)
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "page_number": page_number,
                    "section_title": current_section_title,
                    "text": chunk_text,
                    "token_count": current_chunk_tokens,
                }
            )
            chunk_index += 1

    return chunks
