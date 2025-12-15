# Weaviate Vector Database Integration

Semantic and conversational candidate search powered by Weaviate (named vectors) and Gemini embeddings.

## Overview

- Candidates live in SQLite (source of truth) and Weaviate (vectors) for semantic search on strengths/concerns.
- A chat agent wraps Weaviate's QueryAgent to answer natural language questions with conversation context and cited sources.
- API surface: vector search endpoints + `/api/chat` for conversational queries.

## Setup

### Environment Variables

```bash
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your-api-key
GEMINI_API_KEY=your-gemini-api-key  # Required for embeddings
```

### Collection Configuration

- **Named Vector**: `strengths_vector` (vectorizes `strengths` property)
- **Model**: `gemini-embedding-001`
- **Vectorized Field**: `strengths` only
- **Metadata Fields**: `candidateId`, `jobId`, `username`, `profileUrl`, `skills`, `fitScore`, `location`, `bio`, `concerns`

### Weaviate Collection (chat agent)

- Searches the `Candidates` collection with the properties above
- `target_vector="strengths_vector"` is used for semantic search

## API Endpoints

### Semantic Search (Global)

Search candidates across all jobs:

```bash
GET /api/search/candidates?query=experienced+python+developer&limit=10
```

**Example:**
```bash
curl "http://localhost:8000/api/search/candidates?query=machine+learning+expert&limit=5"
```

**Response:**
```json
{
  "query": "machine learning expert",
  "total_results": 5,
  "candidates": [
    {
      "candidate_id": "uuid-123",
      "username": "ml_expert",
      "strengths": ["Expert in TensorFlow", "Published ML research"],
      "fit_score": 92,
      "similarity_score": 0.89
    }
  ]
}
```

### Get Candidates by Job

```bash
GET /api/vector/candidates?job_id=<job_id>&min_fit_score=70
```

### Conversational Chat

```bash
POST /api/chat
Content-Type: application/json

{
  "conversation_history": [
    {"role": "user", "content": "Find ML engineers"},
    {"role": "assistant", "content": "I found 5 ML engineers..."}
  ],
  "question": "Which one knows PyTorch?"
}
```

**Response:**
```json
{
  "answer": "Among those ML engineers, John Doe has extensive PyTorch experience...",
  "sources": [
    {"username": "john_doe", "profile_url": "https://github.com/john_doe", "fit_score": 85}
  ],
  "conversation": [
    {"role": "user", "content": "Find ML engineers"},
    {"role": "assistant", "content": "I found 5 ML engineers..."},
    {"role": "user", "content": "Which one knows PyTorch?"},
    {"role": "assistant", "content": "Among those ML engineers, John Doe..."}
  ]
}
```

Frontend chat UI is available at `/chat`.

## Testing

Run the test script to verify collection creation and operations:

```bash
python -m backend.services.weaviate.test
```

## Implementation Details

- Uses named vector `strengths_vector` for semantic search
- Queries specify `target_vector="strengths_vector"` when searching
- Vectorization happens asynchronously (allow ~2s after insert for indexing)
- Duplicate prevention: updates existing candidates by `candidateId` instead of creating duplicates
- Chat agent is a singleton (`get_chat_agent`) that preserves conversation context across turns

## Troubleshooting

**Connection Issues:**
- Verify all three environment variables are set
- Check Weaviate cluster is accessible

**No Search Results:**
- Ensure candidates were stored (check logs)
- Wait a few seconds after insert for vectorization
- Try broader search queries
- Verify `GEMINI_API_KEY` is valid

### Chat-Specific Issues

- "Chat service is not configured": ensure `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `GEMINI_API_KEY` are set
- "Weaviate client is not ready": check cluster status and API key permissions
- Empty responses: confirm candidates are loaded and schema matches expectations

## Backend Usage (Chat Agent)

```python
from services.weaviate.chat_agent import get_chat_agent

chat_agent = get_chat_agent()  # singleton

result = chat_agent.ask(
    conversation_history=[],
    new_question="Find ML engineers with PyTorch experience",
)

print(result["answer"])
print(result["sources"])

# follow-up with conversation context
chat_agent.ask(
    conversation_history=result["conversation"],
    new_question="Which one has the highest fit score?",
)
```

## Frontend Usage (Chat)

```typescript
import axios from "axios";

const response = await axios.post("http://localhost:8000/api/chat", {
  conversation_history: messages,
  question: userInput,
});

// response.data.answer
// response.data.sources
```

## How Chat Works

1. User input + prior messages are combined.
2. QueryAgent interprets intent and runs semantic search on `strengths_vector`.
3. Gemini generates a natural language answer.
4. Candidate references are extracted as sources.
5. Conversation history is returned for the next turn.

## Example Queries

- "Find backend engineers who know Rust"
- "Who has the highest fit score?"
- "Show me candidates in San Francisco"
- "Which ML engineers know PyTorch?"
- "Tell me more about John Doe"

## Best Practices

- Always send the full (or truncated) conversation for context.
- Show source links for transparency.
- Truncate very long histories to keep responses fast.
- Display loading/error states in the UI.

## Performance

- Typical chat response time: ~2–5s (Weaviate + Gemini dependent).
- Singleton agent handles concurrent callers; observe provider rate limits.
