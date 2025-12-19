"""
Candidate Chat API endpoints.
"""
import json
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config import settings
from database import get_db, DBCandidate, DBJob, DBChatSession, DBChatMessage
from models import (
    ChatSessionCreate, ChatSession, ChatMessage,
    SendMessageRequest, SendMessageResponse, ToolCallSchema
)
from services.llm import get_llm_service
from services.llm.base import ChatMessage as LLMChatMessage, ChatResponse
from services.chat_tools import ChatToolService, get_available_tools

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Candidate Chat"])


def build_system_prompt(candidate: DBCandidate, job: DBJob) -> str:
    """
    Build a context-rich system prompt for the AI chat.
    """
    # Format top repositories
    repos_text = ""
    if candidate.top_repositories:
        repos_list = []
        for repo in candidate.top_repositories[:5]:
            repo_str = f"- {repo.get('name', 'Unknown')}"
            if repo.get('description'):
                repo_str += f": {repo['description']}"
            if repo.get('language'):
                repo_str += f" ({repo['language']})"
            if repo.get('stars', 0) > 0:
                repo_str += f" ⭐{repo['stars']}"
            repos_list.append(repo_str)
        repos_text = "\n".join(repos_list)
    else:
        repos_text = "No repositories analyzed yet"
    
    requirements_text = ", ".join(job.requirements or []) if job.requirements else "Not specified"
    
    return f"""You are an AI recruiting assistant analyzing candidate {candidate.username}.

CANDIDATE PROFILE:
- GitHub: {candidate.username}
- Bio: {candidate.bio or 'Not provided'}
- Location: {candidate.location or 'Not specified'}
- Fit Score: {candidate.fit_score or 'Not analyzed'}/100
- Skills: {', '.join(candidate.skills or []) or 'Not analyzed'}
- Strengths: {', '.join(candidate.strengths or []) or 'Not analyzed'}
- Concerns: {', '.join(candidate.concerns or []) or 'None identified'}

TOP REPOSITORIES:
{repos_text}

JOB REQUIREMENTS:
Title: {job.title}
Company: {job.company_name}
Requirements: {requirements_text}

You have access to tools to search repositories, compare candidates, analyze activity, and generate interview questions. Use these tools when users ask for specific information or when you need to verify facts.

Be conversational, insightful, and honest about both strengths and gaps. Provide actionable insights for recruiters."""


def db_messages_to_response(messages: list) -> List[ChatMessage]:
    """Convert DB messages to response format."""
    return [
        ChatMessage(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            tool_calls=[ToolCallSchema(**tc) for tc in (msg.tool_calls or [])],
            created_at=msg.created_at
        )
        for msg in messages
    ]


def db_session_to_response(db_session: DBChatSession) -> ChatSession:
    """Convert DBChatSession to ChatSession response."""
    return ChatSession(
        id=db_session.id,
        candidate_id=db_session.candidate_id,
        job_id=db_session.job_id,
        model_provider=db_session.model_provider,
        created_at=db_session.created_at,
        updated_at=db_session.updated_at,
        messages=db_messages_to_response(db_session.messages)
    )


# Composite ID resolution removed - Analyzer now pre-generates UUIDs
# All candidate_id references are now real UUIDs from the start


@router.post("/sessions", response_model=ChatSession)
async def create_chat_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db)
):
    """Create a new chat session for a candidate."""
    # Query candidate by UUID directly
    candidate = db.query(DBCandidate).filter(DBCandidate.id == session_data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {session_data.candidate_id}")

    job = db.query(DBJob).filter(DBJob.id == session_data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    model_provider = job.model_provider or settings.MODEL_PROVIDER

    try:
        db_session = DBChatSession(
            candidate_id=candidate.id,
            job_id=session_data.job_id,
            model_provider=model_provider
        )

        db.add(db_session)
        db.commit()
        db.refresh(db_session)

        logger.info(f"Created chat session {db_session.id} for candidate {candidate.id}")

        return ChatSession(
            id=db_session.id,
            candidate_id=db_session.candidate_id,
            job_id=db_session.job_id,
            model_provider=db_session.model_provider,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
            messages=[]
        )
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create chat session")


@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Get a chat session with its full message history."""
    db_session = db.query(DBChatSession).filter(DBChatSession.id == session_id).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return db_session_to_response(db_session)


@router.get("/sessions/by-candidate/{candidate_id}", response_model=ChatSession)
async def get_candidate_session(
    candidate_id: str,
    latest: bool = True,
    db: Session = Depends(get_db)
):
    """Get a candidate's chat session by UUID."""
    # Query candidate by UUID directly
    candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {candidate_id}")

    query = db.query(DBChatSession).filter(DBChatSession.candidate_id == candidate.id)

    if latest:
        query = query.order_by(DBChatSession.updated_at.desc())

    db_session = query.first()

    if not db_session:
        raise HTTPException(status_code=404, detail="No chat session found for this candidate")

    return db_session_to_response(db_session)


@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_chat_message(
    session_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message to the chat session and get an AI response.
    
    Implements the tool calling loop:
    1. Loads conversation history
    2. Builds system prompt with candidate context
    3. Sends user message to LLM with available tools
    4. Executes any tool calls (max 3 iterations)
    5. Returns final AI response
    """
    db_session = db.query(DBChatSession).filter(DBChatSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    candidate = db.query(DBCandidate).filter(DBCandidate.id == db_session.candidate_id).first()
    job = db.query(DBJob).filter(DBJob.id == db_session.job_id).first()
    
    if not candidate or not job:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    
    try:
        # Save user message
        user_message = DBChatMessage(
            session_id=session_id,
            role="user",
            content=request.content
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Build conversation history
        system_prompt = build_system_prompt(candidate, job)
        llm_messages = [LLMChatMessage(role="system", content=system_prompt)]
        
        for msg in db_session.messages:
            if msg.role in ("user", "assistant"):
                llm_messages.append(LLMChatMessage(role=msg.role, content=msg.content))
        
        llm_messages.append(LLMChatMessage(role="user", content=request.content))
        
        # Initialize services
        llm_service = get_llm_service(db_session.model_provider)
        tool_service = ChatToolService(db, db_session.candidate_id, db_session.job_id)
        tools = get_available_tools()
        
        # Tool calling loop
        all_tool_calls: List[ToolCallSchema] = []
        max_iterations = 3
        response: ChatResponse = None
        
        for iteration in range(max_iterations):
            logger.info(f"Chat iteration {iteration + 1}/{max_iterations}")
            
            response = await llm_service.chat(
                messages=llm_messages,
                tools=tools,
                max_tokens=4096,
                timeout=120
            )
            
            if not response.tool_calls:
                break
            
            for tool_call in response.tool_calls:
                logger.info(f"Executing tool: {tool_call.tool_name}")
                
                try:
                    tool_result = await tool_service.execute_tool(
                        tool_call.tool_name,
                        tool_call.arguments
                    )
                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    tool_result = {"error": str(e)}
                
                all_tool_calls.append(ToolCallSchema(
                    tool=tool_call.tool_name,
                    arguments=tool_call.arguments,
                    result=tool_result
                ))
                
                logger.info(f"Tool result: {tool_result}")
                tool_result_text = f"Tool '{tool_call.tool_name}' result: {json.dumps(tool_result, indent=2)}"
                llm_messages.append(LLMChatMessage(role="assistant", content=response.content or ""))
                llm_messages.append(LLMChatMessage(role="user", content=tool_result_text))
        
        # Save assistant message
        assistant_message = DBChatMessage(
            session_id=session_id,
            role="assistant",
            content=response.content or "",
            tool_calls=[tc.model_dump() for tc in all_tool_calls] if all_tool_calls else None
        )
        db.add(assistant_message)

        db_session.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(assistant_message)
        
        logger.info(f"Chat message processed. Tool calls: {len(all_tool_calls)}")
        
        return SendMessageResponse(
            message=ChatMessage(
                id=assistant_message.id,
                session_id=assistant_message.session_id,
                role=assistant_message.role,
                content=assistant_message.content,
                tool_calls=[ToolCallSchema(**tc) for tc in (assistant_message.tool_calls or [])],
                created_at=assistant_message.created_at
            ),
            tool_calls=all_tool_calls
        )
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")


@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its messages."""
    db_session = db.query(DBChatSession).filter(DBChatSession.id == session_id).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    try:
        db.delete(db_session)
        db.commit()
        
        logger.info(f"Deleted chat session {session_id}")
        return {"message": "Chat session deleted", "session_id": session_id}
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete chat session")


@router.delete("/candidates/{candidate_id}/history")
async def clear_candidate_chat_history(candidate_id: str, db: Session = Depends(get_db)):
    """Clear all chat history for a candidate by UUID."""
    # Query candidate by UUID directly
    candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {candidate_id}")

    try:
        sessions = db.query(DBChatSession).filter(
            DBChatSession.candidate_id == candidate.id
        ).all()
        
        session_count = len(sessions)
        
        for session in sessions:
            db.delete(session)
        
        db.commit()
        
        logger.info(f"Cleared {session_count} chat session(s) for candidate {candidate.id}")
        return {
            "message": "Chat history cleared",
            "candidate_id": candidate.id,
            "sessions_deleted": session_count
        }
    except Exception as e:
        logger.error(f"Error clearing chat history for candidate {candidate_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to clear chat history")


@router.delete("/sessions/{session_id}/messages")
async def clear_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Clear all messages from a chat session but keep the session."""
    db_session = db.query(DBChatSession).filter(DBChatSession.id == session_id).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    try:
        message_count = db.query(DBChatMessage).filter(
            DBChatMessage.session_id == session_id
        ).delete()

        db_session.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Cleared {message_count} messages from session {session_id}")
        return {
            "message": "Session messages cleared",
            "session_id": session_id,
            "messages_deleted": message_count
        }
    except Exception as e:
        logger.error(f"Error clearing messages from session {session_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to clear session messages")


