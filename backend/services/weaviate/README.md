# Weaviate Vector Database Integration

Semantic search for candidate profiles using Weaviate with Google AI Studio embeddings.

## Overview

Candidates are stored in both SQLite (relational) and Weaviate (vector embeddings) for semantic search based on candidate strengths.

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

## Troubleshooting

**Connection Issues:**
- Verify all three environment variables are set
- Check Weaviate cluster is accessible

**No Search Results:**
- Ensure candidates were stored (check logs)
- Wait a few seconds after insert for vectorization
- Try broader search queries
- Verify `GEMINI_API_KEY` is valid
