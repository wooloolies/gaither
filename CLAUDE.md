# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Autonomous Recruiting Agent Swarm - A multi-agent AI system for tech talent acquisition. Three specialized agents (Hunter, Analyzer, Engager) work concurrently to discover GitHub candidates, evaluate their technical fit using LLM analysis, and generate personalized outreach messages.

## Development Commands

### Monorepo Development (pnpm + turbo)
```bash
# Install dependencies
pnpm install

# Run both frontend and backend in development mode
pnpm dev

# Build all packages
pnpm build

# Clean build artifacts and caches
pnpm clean
```

### Backend (Python/FastAPI)
```bash
cd backend

# Run development server (with auto-reload)
uv run -- python run.py
# Server starts on http://localhost:8000
# API docs available at http://localhost:8000/docs

# Clean Python cache files
pnpm clean  # or: find . -name "__pycache__" -exec rm -rf {} +
```

### Frontend (Next.js/React)
```bash
cd frontend

# Run development server (port 5173)
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Python Package Management
This project uses `uv` for Python package management (NOT pip/poetry). The monorepo is configured to use pnpm for JavaScript packages.

```bash
# Add a Python dependency
uv add <package-name>

# Remove a Python dependency
uv remove <package-name>

# Run Python scripts with uv
uv run -- python script.py
```

## Architecture Overview

### Multi-Agent Pipeline
The system follows a producer-consumer pattern with asyncio queues connecting three agents:

```
Hunter Agent → Queue → Analyzer Agent → Queue → Engager Agent → Database
     ↓               ↓                      ↓
  WebSocket      WebSocket             WebSocket
```

**Hunter Agent** (`backend/agents/hunter.py`):
- Extracts comprehensive keywords with semantic understanding (core languages, primary frameworks, related technologies, repository topics, domain keywords, alternative terms)
- Advanced multi-strategy GitHub search:
  1. Repository topic + recent activity search
  2. Primary framework + language combination search
  3. Domain expertise search (bio + repos + activity)
  4. Related technology stack search
  5. Alternative terms search
- Quality scoring system (0-10 scale) based on followers, repos, bio completeness, hireable flag, profile completeness
- Recent activity check (filters out candidates inactive for 6+ months)
- Smart filtering (removes orgs, bots, inactive accounts, tutorial-only accounts, low-quality profiles)
- Puts high-quality candidates into `hunter_to_analyzer_queue`

**Analyzer Agent** (`backend/agents/analyzer.py`):
- Consumes from `hunter_to_analyzer_queue`
- Fetches candidate repositories and commit history from GitHub
- Uses LLM to generate fit scores (0-100) and extract skills/strengths/concerns
- Puts analyzed candidates into `analyzer_to_engager_queue`

**Engager Agent** (`backend/agents/engager.py`):
- Consumes from `analyzer_to_engager_queue`
- Generates personalized outreach messages using LLM
- References specific GitHub projects in messages
- Returns candidates with messages to Orchestrator

**Orchestrator** (`backend/agents/orchestrator.py`):
- Creates asyncio queues for inter-agent communication
- Launches all three agents as concurrent asyncio tasks
- Saves results (candidates + messages) to database
- Updates job status and emits completion events

### LLM Provider Abstraction
The system supports multiple LLM providers through a unified interface:

**Base Interface** (`backend/services/llm/base.py`):
- `LLMService` abstract class defines common methods
- `function_call()` - Structured JSON output via function calling
- `analyze()` - Free-form text analysis

**Implementations**:
- `ClaudeService` (`backend/services/llm/claude_service.py`) - Anthropic Claude API
- `GeminiService` (`backend/services/llm/gemini_service.py`) - Google Gemini API

**Configuration** (`backend/config.py`):
- Set `MODEL_PROVIDER` environment variable to "claude" or "gemini"
- Provider-specific API keys validated on startup
- Model selection configured per provider

### Real-Time Updates (WebSocket)
All agents inherit from `BaseAgent` which provides `emit_event()`:
- Events broadcast to all connected WebSocket clients for the job
- Frontend subscribes via WebSocket hook and updates Zustand store
- Event format: `{event: "agent.action", timestamp, job_id, data}`

### Database Layer
SQLAlchemy ORM with three models (`backend/database.py`):
- `DBJob` - Job postings with status tracking
- `DBCandidate` - Candidate profiles with analysis results
- `DBMessage` - Generated outreach messages (1:1 with candidates)

### Frontend Architecture
Next.js 16 App Router with TypeScript:
- **State Management**: Zustand store (`frontend/src/store/agentStore.js`)
- **Real-time**: WebSocket hook updates store on agent events
- **Styling**: TailwindCSS v4 with dark theme
- **Animations**: Framer Motion (via `motion` package)
- **API Client**: Axios with typed endpoints

## Key Implementation Details

### Agent Communication Pattern
Agents use asyncio queues for decoupled communication:
```python
# Producer (Hunter)
await output_queue.put(candidate)

# Consumer (Analyzer)
candidate = await input_queue.get()
# ... process ...
await output_queue.put(analyzed_candidate)
```

Orchestrator creates queues and passes them to agents during initialization.

### LLM Function Calling
Both Claude and Gemini services use function calling for structured output:
```python
result = await llm_service.function_call(
    prompt="Analyze this candidate...",
    function_name="analyze_candidate",
    function_schema={
        "fit_score": "integer 0-100",
        "skills": "array of strings",
        ...
    }
)
```

The base implementation handles schema conversion and response parsing specific to each provider.

### WebSocket Event Emission
All agents emit events through the base class:
```python
# In any agent
await self.emit_event(
    event_type="hunter.profile_found",
    data={"username": username, "url": profile_url},
    job_id=job_id,
    message=f"Found candidate: {username}"
)
```

WebSocketManager (`backend/services/websocket_manager.py`) maintains job-specific connections and broadcasts to all clients subscribed to that job.

### Advanced GitHub Candidate Search

The Hunter Agent uses a sophisticated multi-strategy approach to find high-quality candidates:

**Semantic Keyword Extraction:**
- Extracts 7 categories of keywords using LLM analysis:
  - `core_languages`: Primary programming languages (max 3)
  - `primary_frameworks`: Must-have frameworks/libraries (max 4)
  - `related_technologies`: Complementary technologies (max 6)
  - `repository_topics`: GitHub topics for repo search (max 5)
  - `domain_keywords`: Domain-specific terms for profiles (max 4)
  - `seniority_level`: Required experience level
  - `alternative_terms`: Alternative names/abbreviations (max 5)

**5 Search Strategies (in order):**
1. **Topic + Activity**: Finds developers with repos tagged with relevant topics who are recently active
2. **Framework + Language Combo**: Searches for specific tech stack combinations (e.g., "PyTorch" + "Python")
3. **Domain Expertise**: Finds people who self-identify with domain keywords and have quality repos
4. **Technology Stack**: Combines related technologies to find well-rounded developers
5. **Alternative Terms**: Uses abbreviations/alternative names (e.g., "k8s" for Kubernetes)

**Quality Scoring (0-10 scale):**
- Followers count (0-3 points): 100+ = 3pts, 50+ = 2pts, 20+ = 1pt
- Public repos (0-2 points): 20+ = 2pts, 10+ = 1pt
- Bio completeness (1 point): 30+ characters
- Hireable flag (1 point)
- Has name (1 point)
- Has location (1 point)
- Has email/company (1 point)
- Healthy follower/following ratio (1 point bonus)

**Recent Activity Check:**
- Fetches user's 5 most recently pushed repositories
- Verifies at least one repo was updated in last 6 months
- Filters out inactive developers automatically

**Smart Filtering:**
- Removes organizations and company accounts
- Filters out tutorial-only accounts (100+ repos, <50 followers)
- Removes bot-like accounts (following >> followers)
- Requires minimum bio length (10+ characters)
- Requires minimum quality score (3/10)
- Checks for recent GitHub activity

### GitHub Service Rate Limiting
GitHub API calls are centralized in `GitHubService` (`backend/services/github_service.py`):
- Personal Access Token required (scopes: `public_repo`, `read:user`)
- No automatic rate limiting implemented - rely on GitHub's rate limit headers
- Methods: `get_user()`, `get_user_repos(sort, per_page)`, `search_users()`, `get_repo_commits()`
- Supports sorting repos by: created, updated, pushed, full_name

### Frontend WebSocket Integration
WebSocket connection managed by custom hook (`frontend/src/hooks/useWebSocket.js`):
- Auto-connects when job ID changes
- Parses events and updates Zustand store
- Handles reconnection on disconnect
- Connection status tracked in UI

### Database Schema
SQLite by default (configurable via `DATABASE_URL`):

**Jobs Table:**
- id (UUID, PK), title, description, requirements (JSON), status
- company_name, company_highlights (JSON), location
- model_provider ("claude" or "gemini")
- **content_hash** (SHA256) - for content-based duplicate detection
- created_at
- Index: `idx_content_hash` on content_hash

**Candidates Table:**
- id (UUID, PK), job_id (FK), username, profile_url, avatar_url
- bio, location, fit_score, skills (JSON), strengths (JSON), concerns (JSON)
- top_repositories (JSON), created_at
- **Unique Index**: `idx_job_username` on (job_id, username) - prevents duplicate candidates per job

**Messages Table:**
- id (UUID, PK), candidate_id (FK), subject, body, generated_at

Relationships: Job (1) → (Many) Candidate (1) → (1) Message

**Deduplication Strategy:**
- **Job deduplication**: Uses SHA256 hash of (title + company + description + requirements) to detect duplicate jobs regardless of creation time. Same job content always returns the same job_id.
- **Candidate deduplication**: Unique constraint on (job_id, username) ensures each candidate appears only once per job. Re-running a job updates existing candidates instead of creating duplicates.
- **Upsert logic**: When saving candidates, system checks if candidate already exists for the job. If yes, updates their data; if no, creates new record.

## Environment Configuration

Required environment variables in `.env`:
```bash
# LLM Provider (choose one)
MODEL_PROVIDER=claude  # or "gemini"

# API Keys (provider-specific)
ANTHROPIC_API_KEY=sk-ant-...  # if MODEL_PROVIDER=claude
GEMINI_API_KEY=...            # if MODEL_PROVIDER=gemini
GITHUB_TOKEN=ghp_...          # required for all

# Optional
APIFY_API_TOKEN=...           # for LinkedIn integration (not implemented)
WEAVIATE_URL=...              # vector database (optional)
WEAVIATE_API_KEY=...

# Server Configuration
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=sqlite:///./lyrathon-wooloolies.db
LOG_LEVEL=INFO
MAX_CANDIDATES_PER_JOB=10
```

Validation occurs at startup in `config.py`. Missing required keys will raise `ValueError`.

## File Organization

### Backend Structure
```
backend/
├── agents/              # Multi-agent system
│   ├── base.py         # BaseAgent with emit_event()
│   ├── hunter.py       # Candidate discovery
│   ├── analyzer.py     # Technical evaluation
│   ├── engager.py      # Message generation
│   └── orchestrator.py # Pipeline coordination
├── services/
│   ├── llm/            # LLM provider abstraction
│   │   ├── base.py     # LLMService interface
│   │   ├── claude_service.py
│   │   └── gemini_service.py
│   ├── weaviate/       # Vector database (optional)
│   ├── github_service.py
│   ├── apify_service.py
│   └── websocket_manager.py
├── api/                # Empty (routes in main.py)
├── main.py             # FastAPI app + endpoints
├── database.py         # SQLAlchemy models
├── models.py           # Pydantic schemas
├── config.py           # Environment variables
└── run.py              # Dev server entry point
```

### Frontend Structure
```
frontend/src/
├── app/                # Next.js App Router
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page
├── components/         # React components
│   ├── Dashboard.jsx
│   ├── JobForm.jsx
│   ├── CandidateCard.jsx
│   └── AgentStatus.jsx
├── store/              # Zustand state management
│   └── agentStore.js
├── hooks/              # Custom React hooks
│   └── useWebSocket.js
├── features/           # Feature-specific components
└── lib/                # Utilities and API clients
```

## Database Migration

### Running the Migration (One-Time)
If you're upgrading from an older version, run the migration script to add deduplication features:

```bash
cd backend
python migrate_add_deduplication.py
```

This migration:
- Adds `content_hash` column to jobs table
- Creates index on content_hash for fast duplicate detection
- Creates unique index on candidates(job_id, username)
- Backfills content_hash for all existing jobs

**Note**: After migration, the same job won't create multiple job_ids anymore, and candidates won't be duplicated when re-running jobs.

**See Also**: For detailed explanation of deduplication strategies and update mechanisms, refer to [DATABASE_DEDUPLICATION.md](docs/DATABASE_DEDUPLICATION.md).

## Testing & Debugging

### API Testing
Swagger UI available at `http://localhost:8000/docs`:
- Interactive API documentation
- Test endpoints directly in browser
- View request/response schemas

### Health Check
```bash
curl http://localhost:8000/health
```

### WebSocket Testing
Connect to `ws://localhost:8000/ws/{job_id}` to monitor real-time events during pipeline execution.

### Common Issues

**No candidates found**:
- Verify GITHUB_TOKEN has correct scopes
- Check GitHub API rate limits
- Broaden job description keywords

**LLM errors**:
- Verify correct API key for selected MODEL_PROVIDER
- Check API credits/quota
- Review model availability (claude-sonnet-4-5-20250929, gemini-2.5-flash)

**WebSocket disconnects**:
- Check CORS settings in `main.py`
- Verify FRONTEND_URL matches actual frontend origin
- Monitor backend logs for connection errors

## Code Patterns & Conventions

### Async/Await Throughout
All agent methods and service calls are async:
```python
async def execute(self, job_id, job_data, output_queue):
    # Agent logic here
    await self.emit_event(...)
```

### Type Hints
Python code uses type hints extensively (validated by Pydantic models).
Frontend uses TypeScript for all components.

### Error Handling
Services should catch and log errors, then re-raise or return error states.
Agents emit error events via WebSocket for user visibility.

### Configuration Over Hard-coding
Use `settings` object from `config.py` for all configurable values.
Never hard-code API keys, URLs, or model names.

## Production Considerations

Current architecture uses:
- SQLite database (single file, not production-ready for scale)
- Single process (no horizontal scaling)
- No caching (every API call hits external services)
- No rate limiting enforcement

For production deployment, consider:
- Migrate to PostgreSQL for database
- Add Redis for caching GitHub/LLM responses
- Implement proper rate limiting per API key
- Use message queue (RabbitMQ/Celery) for agent tasks
- Add monitoring (Prometheus) and error tracking (Sentry)
- Enable HTTPS and proper CORS configuration
- Implement user authentication (OAuth/JWT)
