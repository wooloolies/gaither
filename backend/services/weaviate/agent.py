"""
Weaviate "QueryAgent" integration.

This wraps Weaviate's `weaviate.agents.query.QueryAgent` so it can be used from the
FastAPI app without performing any connection work at import time.

Notes:
- This is optional. If the installed weaviate client does not include `weaviate.agents`,
  we raise a clear error (the rest of the app can still run).
- We reuse the existing Weaviate client created by `WeaviateService` so we don't open
  multiple connections or duplicate auth setup.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable, Optional

from .service import WeaviateService, get_weaviate_service

logger = logging.getLogger(__name__)

try:
    # These are available only in newer weaviate python clients
    from weaviate.agents.query import QueryAgent  # type: ignore
    from weaviate.agents.classes import ChatMessage  # type: ignore
except Exception:  # pragma: no cover
    QueryAgent = None  # type: ignore
    ChatMessage = None  # type: ignore


_query_agent: Optional[Any] = None


def weaviate_query_agent_available() -> bool:
    """Return True if `weaviate.agents` is available in this environment."""
    return QueryAgent is not None and ChatMessage is not None


def get_candidates_query_agent() -> Any:
    """
    Lazily construct a QueryAgent bound to the Candidates collection.

    Reuses the singleton Weaviate client from `WeaviateService`.
    """
    global _query_agent

    if _query_agent is not None:
        return _query_agent

    if not weaviate_query_agent_available():
        raise RuntimeError(
            "Weaviate QueryAgent is not available. "
            "Upgrade weaviate-client to a version that includes `weaviate.agents`."
        )

    service = get_weaviate_service()
    _query_agent = QueryAgent(
        client=service.client,
        collections=[WeaviateService.COLLECTION_NAME],
    )
    return _query_agent


def ask_candidates_agent(messages: Iterable[Any]) -> str:
    """
    Ask the Candidates QueryAgent a question, with conversation history.

    `messages` may be:
    - an iterable of dicts like {"role": "...", "content": "..."}
    - an iterable of objects with `.role` and `.content` attributes
    """
    agent = get_candidates_query_agent()

    conversation = []
    for m in messages:
        if isinstance(m, dict):
            role = m.get("role")
            content = m.get("content")
        else:
            role = getattr(m, "role", None)
            content = getattr(m, "content", None)

        if not role or content is None:
            raise ValueError("Each message must have 'role' and 'content'")

        conversation.append(ChatMessage(role=role, content=content))

    response = agent.ask(conversation)
    return getattr(response, "final_answer", str(response))


if __name__ == "__main__":  # pragma: no cover
    # Minimal manual REPL for local debugging
    try:
        agent = get_candidates_query_agent()
    except Exception as e:
        print(f"Failed to initialize Weaviate QueryAgent: {e}")
        raise

    convo = []
    print("Weaviate QueryAgent REPL. Type 'exit' to quit.")
    while True:
        user_input = input("Enter your query: ")
        if user_input.strip().lower() == "exit":
            break
        convo.append({"role": "user", "content": user_input})
        answer = ask_candidates_agent(convo)
        print(answer)
        convo.append({"role": "assistant", "content": answer})