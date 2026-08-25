"""
DiligenceOS API — AI Research (RAG Q&A) Endpoints.

Provides:
- POST /companies/{company_id}/research — Execute RAG query against company documents
- GET  /companies/{company_id}/research/sessions — List research sessions for a company
- GET  /research/sessions/{id}/messages — List all messages and citations in a session
"""

import json
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.company import Company
from app.models.document import Document
from app.models.research_message import ResearchMessage
from app.models.research_session import ResearchSession
from app.models.user import User
from app.schemas.research import (
    CitationResponse,
    ResearchAnswerResponse,
    ResearchMessageResponse,
    ResearchRequest,
    ResearchSessionResponse,
)
from app.services.embeddings import generate_embeddings
from app.services.rag import (
    extract_and_save_citations,
    generate_rag_answer,
    retrieve_relevant_chunks,
    stream_rag_answer,
)

router = APIRouter(tags=["research"])


@router.post(
    "/companies/{company_id}/research",
    status_code=status.HTTP_200_OK,
    summary="Ask a question against company documents (RAG Q&A with token streaming)",
)
def ask_company_research_question(
    company_id: UUID,
    payload: ResearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Executes a RAG query against company document chunks and streams the response token-by-token using SSE.
    Enforces strict workspace tenant isolation.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # 1. Enforce hard workspace tenant isolation
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # 2. Lookup or create ResearchSession
    session: Optional[ResearchSession] = None
    if payload.session_id:
        session = (
            db.query(ResearchSession)
            .filter(
                ResearchSession.id == payload.session_id,
                ResearchSession.company_id == company_id,
            )
            .first()
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Research session not found",
            )
    else:
        title_text = payload.question[:60] + ("..." if len(payload.question) > 60 else "")
        session = ResearchSession(
            id=uuid4(),
            company_id=company_id,
            user_id=current_user.id,
            title=title_text,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 3. Generate question embedding
    q_embeddings = generate_embeddings([payload.question])
    question_vector = q_embeddings[0] if q_embeddings else []

    # 4. Vector retrieval of document chunks
    chunks_info, max_score = retrieve_relevant_chunks(db, company_id, question_vector, top_k=10, question=payload.question)

    # Extract session.id to local variable before DB session expiration/detach in generator
    target_session_id = session.id
    session_id_str = str(target_session_id)

    # 5. Save User Message
    user_msg = ResearchMessage(
        id=uuid4(),
        session_id=target_session_id,
        role="user",
        content=payload.question,
    )
    db.add(user_msg)
    db.commit()

    def sse_event_generator():
        assistant_msg_id = uuid4()
        full_answer_parts = []

        try:
            # 6. Relevance Thresholding Check (REQ-RAG-05)
            if not chunks_info or max_score < 0.15:
                no_evidence_answer = (
                    "Based on the provided documents, I could not find relevant evidence to answer your question."
                )
                assistant_msg = ResearchMessage(
                    id=assistant_msg_id,
                    session_id=target_session_id,
                    role="assistant",
                    content=no_evidence_answer,
                )
                db.add(assistant_msg)
                db.commit()

                delta_payload = json.dumps({"type": "text_delta", "text": no_evidence_answer})
                yield f"data: {delta_payload}\n\n"

                done_payload = json.dumps({
                    "type": "done",
                    "session_id": session_id_str,
                    "message_id": str(assistant_msg_id),
                    "citations": [],
                })
                yield f"data: {done_payload}\n\n"
                return

            # 7. Stream tokens token-by-token
            for text_delta in stream_rag_answer(payload.question, chunks_info):
                full_answer_parts.append(text_delta)
                delta_payload = json.dumps({"type": "text_delta", "text": text_delta})
                yield f"data: {delta_payload}\n\n"

            # 8. Save Assistant Message
            full_answer_text = "".join(full_answer_parts)
            assistant_msg = ResearchMessage(
                id=assistant_msg_id,
                session_id=target_session_id,
                role="assistant",
                content=full_answer_text,
            )
            db.add(assistant_msg)
            db.commit()

            # 9. Extract and save Citations (REQ-CITE-01..03)
            citations_data = extract_and_save_citations(db, assistant_msg.id, full_answer_text, chunks_info)

            done_payload = json.dumps({
                "type": "done",
                "session_id": session_id_str,
                "message_id": str(assistant_msg_id),
                "citations": citations_data,
            })
            yield f"data: {done_payload}\n\n"

        except Exception as err:
            partial_text = "".join(full_answer_parts) or "An error occurred while generating response."
            try:
                assistant_msg = ResearchMessage(
                    id=assistant_msg_id,
                    session_id=target_session_id,
                    role="assistant",
                    content=partial_text,
                )
                db.add(assistant_msg)
                db.commit()
                citations_data = extract_and_save_citations(db, assistant_msg.id, partial_text, chunks_info) if chunks_info else []
            except Exception:
                db.rollback()
                citations_data = []

            err_payload = json.dumps({
                "type": "error",
                "detail": str(err),
                "session_id": session_id_str,
                "message_id": str(assistant_msg_id),
                "citations": citations_data,
            })
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@router.get(
    "/companies/{company_id}/research/sessions",
    response_model=List[ResearchSessionResponse],
    summary="List past research sessions for a company",
)
def list_company_research_sessions(
    company_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists all past research sessions for a company in the user's workspace (REQ-RAG-06).
    Supports skip and limit query pagination (REQ-PERF-03).
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    sessions = (
        db.query(ResearchSession)
        .filter(ResearchSession.company_id == company_id)
        .order_by(ResearchSession.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        msg_count = db.query(ResearchMessage).filter(ResearchMessage.session_id == s.id).count()
        result.append(
            ResearchSessionResponse(
                id=s.id,
                company_id=s.company_id,
                title=s.title,
                created_at=s.created_at,
                message_count=msg_count,
            )
        )
    return result


@router.get(
    "/research/sessions/{id}/messages",
    response_model=List[ResearchMessageResponse],
    summary="List messages and citations for a research session",
)
def get_session_messages(
    id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns user and assistant messages with citations for a research session.
    Enforces hard tenant isolation boundary.
    Supports skip and limit query pagination (REQ-PERF-03).
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found",
        )

    session = (
        db.query(ResearchSession)
        .join(Company)
        .filter(
            ResearchSession.id == id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found",
        )

    messages = (
        db.query(ResearchMessage)
        .filter(ResearchMessage.session_id == id)
        .order_by(ResearchMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for msg in messages:
        citation_resps = []
        for cite in msg.citations:
            doc = db.query(Document).filter(Document.id == cite.document_id).first()
            filename = doc.filename if doc else "Document"
            citation_resps.append(
                CitationResponse(
                    id=cite.id,
                    chunk_id=cite.chunk_id,
                    document_id=cite.document_id,
                    filename=filename,
                    page_number=cite.page_number,
                    excerpt=cite.excerpt,
                )
            )

        result.append(
            ResearchMessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
                citations=citation_resps,
            )
        )

    return result
