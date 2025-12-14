# Architecture Documentation

## Table of Contents
1. [Production Architecture](#production-architecture)
2. [System Overview](#system-overview)
3. [Architecture Flowcharts](#architecture-flowcharts)
4. [Architecture Patterns](#architecture-patterns)
5. [System Architecture](#system-architecture)
6. [Component Breakdown](#component-breakdown)
7. [Data Flow](#data-flow)
8. [Technology Stack](#technology-stack)
9. [Agent System](#agent-system)
10. [API Architecture](#api-architecture)
11. [Frontend Architecture](#frontend-architecture)
12. [Database Schema](#database-schema)
13. [Communication Patterns](#communication-patterns)
14. [Deployment Architecture](#deployment-architecture)

---

## Production Architecture

### Production Infrastructure

```mermaid
flowchart TB
    subgraph Frontend["Frontend"]
        Vercel[Vercel<br/>React Frontend]
    end
    
    subgraph Backend["Backend Services"]
        Render[Render<br/>FastAPI Backend]
    end
    
    subgraph Databases["Databases"]
        Neo4j[(Neo4j<br/>Graph Database)]
        Weaviate[(Weaviate<br/>Vector Database)]
    end
    
    subgraph AI["AI Services"]
        LLM{Gemini or<br/>Claude}
    end
    
    subgraph External["External APIs"]
        GitHub[GitHub API]
    end
    
    Vercel -->|HTTPS| Render
    Render -->|Query| Neo4j
    Render -->|Vector Search| Weaviate
    Render -->|AI Requests| LLM
    Render -->|API Calls| GitHub
    
    style Vercel fill:#000,color:#fff
    style Render fill:#0ea5e9,color:#fff
    style Neo4j fill:#008cc1,color:#fff
    style Weaviate fill:#4f46e5,color:#fff
    style LLM fill:#f59e0b,color:#fff
    style GitHub fill:#24292e,color:#fff
```

### Component Overview

- **Vercel**: Frontend hosting and deployment
- **Render**: Backend API server hosting
- **Neo4j**: Graph database for relationship data
- **Weaviate**: Vector database for semantic search
- **Gemini/Claude**: AI/LLM services for analysis and generation
- **GitHub**: External API for candidate discovery

---

## System Overview

**Lyrathon-Wooloolies** is an autonomous multi-agent recruiting system that automates the entire talent acquisition pipeline—from candidate discovery to personalized outreach. The system uses three specialized AI agents working in parallel to find, evaluate, and engage tech talent in real-time.

### Key Features
- **Autonomous Pipeline**: Three AI agents (Hunter, Analyzer, Engager) work concurrently
- **Real-Time Updates**: WebSocket-based live dashboard showing agent activity
- **AI-Powered Analysis**: Claude AI evaluates code quality and generates fit scores
- **Personalized Messages**: Context-aware outreach referencing specific GitHub projects
- **Modern UI**: Dark-themed dashboard with smooth animations

---

## Architecture Flowcharts

### Overall System Flow

```mermaid
flowchart TB
    Start([User Creates Job]) --> JobForm[Job Form]
    JobForm -->|POST /api/jobs| FastAPI[FastAPI Server]
    FastAPI --> DB[(SQLite Database)]
    FastAPI -->|Job Created| StartPipeline[Start Pipeline]
    
    StartPipeline --> Orchestrator[Orchestrator]
    Orchestrator -->|Create Queues| Queue1[Hunter Queue]
    Orchestrator -->|Create Queues| Queue2[Analyzer Queue]
    Orchestrator -->|Create Queues| Queue3[Engager Queue]
    
    Orchestrator -->|Start Tasks| HunterAgent[Hunter Agent]
    Orchestrator -->|Start Tasks| AnalyzerAgent[Analyzer Agent]
    Orchestrator -->|Start Tasks| EngagerAgent[Engager Agent]
    
    HunterAgent -->|Extract Keywords| Claude[Claude API]
    HunterAgent -->|Search| GitHub[GitHub API]
    HunterAgent -->|Put Candidates| Queue1
    
    Queue1 -->|Get Candidate| AnalyzerAgent
    AnalyzerAgent -->|Fetch Repos| GitHub
    AnalyzerAgent -->|Analyze| Claude
    AnalyzerAgent -->|Put Analyzed| Queue2
    
    Queue2 -->|Get Candidate| EngagerAgent
    EngagerAgent -->|Generate Message| Claude
    EngagerAgent -->|Return Results| Orchestrator
    
    Orchestrator -->|Save Results| DB
    Orchestrator -->|Update Status| DB
    
    HunterAgent -->|Emit Events| WSManager[WebSocket Manager]
    AnalyzerAgent -->|Emit Events| WSManager
    EngagerAgent -->|Emit Events| WSManager
    Orchestrator -->|Emit Events| WSManager
    
    WSManager -->|Broadcast| Frontend[React Frontend]
    Frontend -->|Display| Dashboard[Dashboard UI]
    
    style HunterAgent fill:#3b82f6
    style AnalyzerAgent fill:#10b981
    style EngagerAgent fill:#8b5cf6
    style Claude fill:#f59e0b
    style GitHub fill:#6b7280
    style WSManager fill:#ef4444
```

### Agent Pipeline Flow

```mermaid
flowchart LR
    subgraph Hunter["🔍 Hunter Agent"]
        H1[Extract Keywords<br/>via Claude] --> H2[Search GitHub<br/>Multi-Strategy]
        H2 --> H3[Filter Candidates<br/>Remove Orgs/Bots]
        H3 --> H4[Emit Events]
    end
    
    subgraph Queue1["Queue 1"]
        Q1[asyncio.Queue]
    end
    
    subgraph Analyzer["🧠 Analyzer Agent"]
        A1[Get Candidate<br/>from Queue] --> A2[Fetch Repositories<br/>GitHub API]
        A2 --> A3[Analyze with Claude<br/>Fit Score + Skills]
        A3 --> A4[Emit Events]
    end
    
    subgraph Queue2["Queue 2"]
        Q2[asyncio.Queue]
    end
    
    subgraph Engager["💬 Engager Agent"]
        E1[Get Candidate<br/>from Queue] --> E2[Generate Message<br/>via Claude]
        E2 --> E3[Personalize<br/>Reference Projects]
        E3 --> E4[Emit Events]
    end
    
    subgraph Persist["💾 Persistence"]
        P1[Save to Database]
        P2[Update Job Status]
    end
    
    Hunter -->|Put Candidates| Queue1
    Queue1 -->|Get Candidate| Analyzer
    Analyzer -->|Put Analyzed| Queue2
    Queue2 -->|Get Candidate| Engager
    Engager -->|Return Results| Persist
    Persist -->|Complete| End([Pipeline Complete])
    
    style Hunter fill:#3b82f6,color:#fff
    style Analyzer fill:#10b981,color:#fff
    style Engager fill:#8b5cf6,color:#fff
    style Queue1 fill:#fbbf24
    style Queue2 fill:#fbbf24
    style Persist fill:#6b7280,color:#fff
```

### Real-Time Update Flow

```mermaid
sequenceDiagram
    participant User as User/Frontend
    participant WS as WebSocket
    participant WSManager as WebSocket Manager
    participant Agent as Agent (Hunter/Analyzer/Engager)
    participant Store as Zustand Store
    participant UI as React Components
    
    User->>WS: Connect to /ws/{job_id}
    WS->>WSManager: Register Connection
    
    Agent->>Agent: Execute Logic
    Agent->>WSManager: emit_event(event_type, data, job_id)
    WSManager->>WSManager: Format Event (JSON)
    WSManager->>WS: broadcast(job_id, event, data)
    WS->>User: Send WebSocket Message
    
    User->>Store: Parse Event & Update State
    Store->>UI: Trigger Re-render
    UI->>User: Display Real-time Update
    
    Note over Agent,UI: Events: hunter.search_started,<br/>analyzer.completed,<br/>engager.message_generated, etc.
```

### Data Flow Diagram

```mermaid
flowchart TD
    subgraph Frontend["Frontend Layer"]
        JobForm[Job Form]
        Dashboard[Dashboard]
        WebSocketHook[WebSocket Hook]
        ZustandStore[Zustand Store]
    end
    
    subgraph API["API Layer"]
        REST[REST Endpoints]
        WS[WebSocket Endpoint]
    end
    
    subgraph Orchestration["Orchestration Layer"]
        Orchestrator[Orchestrator]
        Hunter[Hunter Agent]
        Analyzer[Analyzer Agent]
        Engager[Engager Agent]
    end
    
    subgraph Services["Service Layer"]
        ClaudeService[Claude Service]
        GitHubService[GitHub Service]
        WSManager[WebSocket Manager]
    end
    
    subgraph External["External APIs"]
        ClaudeAPI[Anthropic Claude API]
        GitHubAPI[GitHub REST API]
    end
    
    subgraph Data["Data Layer"]
        Database[(SQLite Database)]
    end
    
    JobForm -->|POST /api/jobs| REST
    REST -->|Create Job| Database
    REST -->|Return Job ID| JobForm
    
    JobForm -->|POST /api/jobs/{id}/start| REST
    REST -->|Start Pipeline| Orchestrator
    
    Orchestrator -->|Coordinate| Hunter
    Orchestrator -->|Coordinate| Analyzer
    Orchestrator -->|Coordinate| Engager
    
    Hunter -->|Extract Keywords| ClaudeService
    ClaudeService -->|API Call| ClaudeAPI
    Hunter -->|Search Users| GitHubService
    GitHubService -->|API Call| GitHubAPI
    
    Analyzer -->|Fetch Repos| GitHubService
    Analyzer -->|Analyze| ClaudeService
    
    Engager -->|Generate Message| ClaudeService
    
    Hunter -->|Emit Events| WSManager
    Analyzer -->|Emit Events| WSManager
    Engager -->|Emit Events| WSManager
    Orchestrator -->|Emit Events| WSManager
    
    WSManager -->|Broadcast| WS
    WS -->|Real-time Updates| WebSocketHook
    WebSocketHook -->|Update State| ZustandStore
    ZustandStore -->|Re-render| Dashboard
    
    Orchestrator -->|Save Results| Database
    Dashboard -->|GET /api/candidates| REST
    REST -->|Query| Database
    Database -->|Return Data| REST
    REST -->|Response| Dashboard
    
    style Frontend fill:#3b82f6,color:#fff
    style API fill:#10b981,color:#fff
    style Orchestration fill:#8b5cf6,color:#fff
    style Services fill:#f59e0b,color:#fff
    style External fill:#ef4444,color:#fff
    style Data fill:#6b7280,color:#fff
```

### Request/Response Flow

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as FastAPI Server
    participant Orchestrator as Orchestrator
    participant Hunter as Hunter Agent
    participant Analyzer as Analyzer Agent
    participant Engager as Engager Agent
    participant Claude as Claude API
    participant GitHub as GitHub API
    participant DB as Database
    participant WS as WebSocket Manager
    
    Client->>API: POST /api/jobs (Create Job)
    API->>DB: Save Job
    DB-->>API: Job Created
    API-->>Client: Return Job (with ID)
    
    Client->>API: POST /api/jobs/{id}/start
    API->>Orchestrator: start_job(job_id, job_data)
    API-->>Client: Job Started
    
    par Hunter Agent Pipeline
        Orchestrator->>Hunter: execute(job_id, job_data, queue)
        Hunter->>Claude: Extract Keywords
        Claude-->>Hunter: Keywords
        Hunter->>GitHub: Search Users
        GitHub-->>Hunter: Users
        Hunter->>WS: Emit: hunter.search_started
        WS-->>Client: WebSocket Event
        Hunter->>Queue1: Put Candidate
        Hunter->>WS: Emit: hunter.profile_found
        WS-->>Client: WebSocket Event
    and Analyzer Agent Pipeline
        Hunter->>Queue1: Put Candidate
        Queue1->>Analyzer: Get Candidate
        Analyzer->>WS: Emit: analyzer.started
        WS-->>Client: WebSocket Event
        Analyzer->>GitHub: Get Repositories
        GitHub-->>Analyzer: Repositories
        Analyzer->>Claude: Analyze Candidate
        Claude-->>Analyzer: Analysis (fit_score, skills)
        Analyzer->>WS: Emit: analyzer.completed
        WS-->>Client: WebSocket Event
        Analyzer->>Queue2: Put Analyzed Candidate
    and Engager Agent Pipeline
        Analyzer->>Queue2: Put Candidate
        Queue2->>Engager: Get Candidate
        Engager->>WS: Emit: engager.started
        WS-->>Client: WebSocket Event
        Engager->>Claude: Generate Message
        Claude-->>Engager: Message (subject, body)
        Engager->>WS: Emit: engager.message_generated
        WS-->>Client: WebSocket Event
        Engager-->>Orchestrator: Return Candidates
    end
    
    Orchestrator->>DB: Save Candidates & Messages
    Orchestrator->>DB: Update Job Status
    Orchestrator->>WS: Emit: pipeline.completed
    WS-->>Client: WebSocket Event
    
    Client->>API: GET /api/candidates?job_id={id}
    API->>DB: Query Candidates
    DB-->>API: Candidates
    API-->>Client: Return Candidates
```

### Component Interaction Diagram

```mermaid
graph TB
    subgraph UI["User Interface"]
        A[Job Form] --> B[Dashboard]
        B --> C[Candidate Grid]
        B --> D[Agent Status]
        B --> E[Metrics Panel]
    end
    
    subgraph State["State Management"]
        F[Zustand Store]
        G[WebSocket Hook]
    end
    
    subgraph API["API Layer"]
        H[REST Client]
        I[WebSocket Client]
    end
    
    subgraph Backend["Backend Services"]
        J[FastAPI App]
        K[Orchestrator]
        L[Hunter Agent]
        M[Analyzer Agent]
        N[Engager Agent]
        O[WebSocket Manager]
    end
    
    subgraph External["External Services"]
        P[Claude API]
        Q[GitHub API]
    end
    
    subgraph Storage["Storage"]
        R[(SQLite DB)]
    end
    
    A -->|Submit Job| H
    H -->|POST /api/jobs| J
    J -->|Save| R
    
    B -->|Connect| I
    I -->|WS /ws/{job_id}| O
    
    J -->|Start Pipeline| K
    K -->|Coordinate| L
    K -->|Coordinate| M
    K -->|Coordinate| N
    
    L -->|Extract Keywords| P
    L -->|Search| Q
    L -->|Emit Events| O
    O -->|Broadcast| I
    I -->|Update| G
    G -->|Update State| F
    F -->|Re-render| B
    
    M -->|Fetch Repos| Q
    M -->|Analyze| P
    M -->|Emit Events| O
    
    N -->|Generate Message| P
    N -->|Emit Events| O
    
    K -->|Save Results| R
    B -->|Fetch Candidates| H
    H -->|GET /api/candidates| J
    J -->|Query| R
    R -->|Return| J
    J -->|Response| H
    H -->|Update| F
    
    style UI fill:#3b82f6,color:#fff
    style State fill:#10b981,color:#fff
    style API fill:#f59e0b,color:#fff
    style Backend fill:#8b5cf6,color:#fff
    style External fill:#ef4444,color:#fff
    style Storage fill:#6b7280,color:#fff
```

---

## Architecture Patterns

### 1. **Multi-Agent System**
- Each agent has a specialized role (Hunter, Analyzer, Engager)
- Agents communicate via asyncio queues
- Orchestrator coordinates agent execution

### 2. **Event-Driven Architecture**
- Agents emit events for real-time updates
- WebSocket manager broadcasts events to connected clients
- Frontend subscribes to job-specific WebSocket streams

### 3. **Pipeline Architecture**
- Sequential stages: Discovery → Analysis → Engagement
- Asynchronous processing with queues
- Error handling at each stage

### 4. **Service Layer Pattern**
- External APIs abstracted into service classes
- Centralized configuration management
- Dependency injection for testability

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Frontend (Vite + TailwindCSS)          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │  Dashboard   │  │  Job Form    │  │  Candidate   │  │  │
│  │  │              │  │              │  │  Cards       │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │         Zustand Store (State Management)           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │         WebSocket Hook (Real-time Updates)         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                      API LAYER (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FastAPI Application                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   REST API   │  │   WebSocket  │  │   Health     │  │  │
│  │  │   Endpoints  │  │   Endpoints  │  │   Check      │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  ORCHESTRATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              RecruitingOrchestrator                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   Hunter     │  │   Analyzer   │  │   Engager    │  │  │
│  │  │   Agent      │──▶│   Agent      │──▶│   Agent      │  │  │
│  │  │              │   │              │   │              │  │  │
│  │  └──────────────┘   └──────────────┘   └──────────────┘  │  │
│  │         │                  │                  │            │  │
│  │         └──────────────────┴──────────────────┘            │  │
│  │                     asyncio.Queue                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    SERVICE LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Claude     │  │   GitHub     │  │   WebSocket  │        │
│  │   Service    │  │   Service    │  │   Manager    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Anthropic   │  │   GitHub     │  │   Apify      │        │
│  │  Claude API  │  │   REST API   │  │   (Future)   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    DATA LAYER                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SQLAlchemy ORM + SQLite                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │   Jobs   │  │Candidate │  │ Messages │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Backend Components

#### 1. **FastAPI Application** (`backend/main.py`)
- **Purpose**: Main application entry point
- **Responsibilities**:
  - REST API endpoints (jobs, candidates, messages)
  - WebSocket endpoint management
  - CORS middleware configuration
  - Database initialization
  - Background task orchestration

**Key Endpoints**:
- `POST /api/jobs` - Create a new recruiting job
- `POST /api/jobs/{id}/start` - Start agent pipeline
- `GET /api/jobs/{id}` - Get job details
- `GET /api/candidates` - List candidates
- `GET /api/candidates/{id}/message` - Get outreach message
- `WS /ws/{job_id}` - WebSocket connection for real-time updates

#### 2. **Orchestrator** (`backend/agents/orchestrator.py`)
- **Purpose**: Coordinates all agents in the pipeline
- **Responsibilities**:
  - Creates asyncio queues for inter-agent communication
  - Manages agent lifecycle (start, monitor, complete)
  - Saves results to database
  - Updates job status
  - Emits pipeline completion events

**Pipeline Flow**:
```
Hunter → [Queue] → Analyzer → [Queue] → Engager → Database
```

#### 3. **Base Agent** (`backend/agents/base.py`)
- **Purpose**: Base class for all agents
- **Responsibilities**:
  - Event emission to WebSocket manager
  - Logging setup
  - Common utilities for agents

#### 4. **Hunter Agent** (`backend/agents/hunter.py`)
- **Purpose**: Finds candidates matching job requirements
- **Responsibilities**:
  - Extracts keywords from job description using Claude
  - Searches GitHub using multi-strategy approach
  - Filters candidates (removes orgs, bots, inactive accounts)
  - Emits discovery events
  - Sends candidates to Analyzer queue

**Search Strategies**:
1. Framework-specific search (repos with specific tech)
2. Language-based search (established developers)
3. Combined keyword search (bio/profile matching)

#### 5. **Analyzer Agent** (`backend/agents/analyzer.py`)
- **Purpose**: Evaluates candidate technical skills
- **Responsibilities**:
  - Fetches candidate repositories from GitHub
  - Analyzes code quality and project relevance
  - Uses Claude AI for fit score (0-100)
  - Generates skills, strengths, and concerns
  - Emits analysis events
  - Sends analyzed candidates to Engager queue

**Analysis Process**:
1. Fetch top repositories (sorted by stars)
2. Get recent commit messages
3. Build analysis prompt with job requirements
4. Use Claude function calling for structured output
5. Extract fit score, skills, strengths, concerns

#### 6. **Engager Agent** (`backend/agents/engager.py`)
- **Purpose**: Generates personalized outreach messages
- **Responsibilities**:
  - Uses Claude to generate personalized messages
  - References specific GitHub projects
  - Connects candidate skills to job requirements
  - Creates subject line and body (< 200 words)
  - Emits message generation events

#### 7. **Claude Service** (`backend/services/claude_service.py`)
- **Purpose**: Interface to Anthropic Claude API
- **Responsibilities**:
  - Function calling for structured output
  - Text analysis
  - Async API calls (using asyncio.to_thread)
  - Error handling and retries

**Key Methods**:
- `function_call()` - Structured JSON output via function calling
- `analyze()` - Free-form text analysis

#### 8. **GitHub Service** (`backend/services/github_service.py`)
- **Purpose**: Interface to GitHub REST API
- **Responsibilities**:
  - User profile fetching
  - Repository data retrieval
  - User search
  - Commit history fetching
  - Rate limit management

**Key Methods**:
- `get_user()` - Get user profile
- `get_user_repos()` - Get user repositories
- `search_users()` - Search for users
- `get_repo_commits()` - Get repository commits

#### 9. **WebSocket Manager** (`backend/services/websocket_manager.py`)
- **Purpose**: Manages WebSocket connections and broadcasting
- **Responsibilities**:
  - Connection management (connect/disconnect)
  - Job-based connection routing
  - Event broadcasting to all connected clients
  - Dead connection cleanup

**Event Format**:
```json
{
  "event": "agent.event_type",
  "timestamp": "2024-01-01T00:00:00Z",
  "job_id": "uuid",
  "data": { ... }
}
```

#### 10. **Database Models** (`backend/database.py`)
- **Purpose**: SQLAlchemy ORM models
- **Models**:
  - `DBJob` - Job postings
  - `DBCandidate` - Candidate profiles and analysis
  - `DBMessage` - Generated outreach messages

#### 11. **Pydantic Models** (`backend/models.py`)
- **Purpose**: API request/response validation
- **Models**:
  - `JobCreate`, `Job` - Job schemas
  - `Candidate`, `CandidateAnalysis` - Candidate schemas
  - `OutreachMessage` - Message schema
  - `WebSocketEvent` - WebSocket event schema

#### 12. **Configuration** (`backend/config.py`)
- **Purpose**: Environment variable management
- **Settings**:
  - API keys (Anthropic, GitHub, Apify)
  - Database URL
  - Server configuration
  - Logging level
  - Model selection

### Frontend Components

#### 1. **Dashboard** (`frontend/src/components/Dashboard.jsx`)
- **Purpose**: Main application interface
- **Responsibilities**:
  - Job form submission
  - Real-time candidate display
  - Agent status monitoring
  - Metrics display
  - WebSocket connection management

#### 2. **Job Form** (`frontend/src/components/JobForm.jsx`)
- **Purpose**: Job creation form
- **Fields**:
  - Job title
  - Company name
  - Location
  - Description
  - Requirements
  - Company highlights

#### 3. **Agent Status** (`frontend/src/components/AgentStatus.jsx`)
- **Purpose**: Shows current agent activity
- **Displays**:
  - Agent states (idle, active, complete)
  - Real-time events
  - Activity timeline

#### 4. **Candidate Card** (`frontend/src/components/CandidateCard.jsx`)
- **Purpose**: Displays candidate information
- **Displays**:
  - Avatar and profile link
  - Fit score (0-100)
  - Skills tags
  - Analysis summary
  - Generated message preview

#### 5. **Candidate Grid** (`frontend/src/components/CandidateGrid.jsx`)
- **Purpose**: Grid layout for candidate cards
- **Features**:
  - Responsive grid
  - Framer Motion animations
  - Empty state handling

#### 6. **Metrics Panel** (`frontend/src/components/MetricsPanel.jsx`)
- **Purpose**: Real-time metrics display
- **Metrics**:
  - Total candidates found
  - Average fit score
  - Messages generated
  - Time elapsed

#### 7. **Zustand Store** (`frontend/src/store/agentStore.js`)
- **Purpose**: Global state management
- **State**:
  - Agent states (hunter, analyzer, engager)
  - Candidates array
  - Events array
  - Metrics object
  - Current job

#### 8. **WebSocket Hook** (`frontend/src/hooks/useWebSocket.js`)
- **Purpose**: WebSocket connection management
- **Features**:
  - Auto-connect on job ID change
  - Event parsing and state updates
  - Reconnection logic
  - Connection status tracking

#### 9. **API Client** (`frontend/src/api/client.js`)
- **Purpose**: REST API client (Axios)
- **Endpoints**:
  - Jobs API
  - Candidates API
  - Messages API

---

## Data Flow

### Job Creation Flow

```
1. User fills JobForm
   ↓
2. POST /api/jobs → FastAPI creates DBJob
   ↓
3. Frontend receives job ID
   ↓
4. POST /api/jobs/{id}/start → FastAPI
   ↓
5. Background task: orchestrator.start_job()
   ↓
6. Orchestrator creates queues and starts agents
```

### Pipeline Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         HUNTER AGENT                            │
│  1. Extract keywords (Claude)                                   │
│  2. Search GitHub (multi-strategy)                              │
│  3. Filter candidates                                           │
│  4. Emit events → WebSocket                                     │
│  5. Put candidates → hunter_to_analyzer_queue                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ANALYZER AGENT                           │
│  1. Get candidate from queue                                    │
│  2. Fetch repositories (GitHub)                                 │
│  3. Analyze with Claude                                         │
│  4. Generate fit score + skills                                 │
│  5. Emit events → WebSocket                                     │
│  6. Put analyzed candidate → analyzer_to_engager_queue          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ENGAGER AGENT                            │
│  1. Get candidate from queue                                    │
│  2. Generate message (Claude)                                   │
│  3. Emit events → WebSocket                                     │
│  4. Return candidates with messages                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                            │
│  1. Save candidates + messages to database                      │
│  2. Update job status to "completed"                            │
│  3. Emit completion event → WebSocket                           │
└─────────────────────────────────────────────────────────────────┘
```

### Real-Time Update Flow

```
Agent emits event
   ↓
BaseAgent.emit_event()
   ↓
WebSocketManager.broadcast()
   ↓
WebSocket.send_text() → All connected clients
   ↓
Frontend WebSocket hook receives event
   ↓
Zustand store updates state
   ↓
React components re-render
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12 | Programming language |
| FastAPI | 0.104.1 | Web framework, REST API |
| Uvicorn | 0.24.0 | ASGI server |
| SQLAlchemy | 2.0.23 | ORM, database abstraction |
| SQLite | - | Database (default) |
| Anthropic SDK | 0.75.0 | Claude AI integration |
| httpx | 0.25.1 | Async HTTP client |
| Pydantic | 2.5.0 | Data validation |
| python-dotenv | 1.0.0 | Environment variables |
| websockets | 12.0 | WebSocket support |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| Vite | Latest | Build tool, dev server |
| Zustand | Latest | State management |
| TailwindCSS | Latest | Styling |
| Framer Motion | Latest | Animations |
| Axios | Latest | HTTP client |
| react-use-websocket | Latest | WebSocket hook |

### External Services

| Service | Purpose |
|---------|---------|
| Anthropic Claude API | AI-powered analysis and generation |
| GitHub REST API | Candidate discovery and repository data |
| Apify API | (Future) LinkedIn integration |

---

## Agent System

### Agent Architecture

All agents inherit from `BaseAgent` and implement the `execute()` method:

```python
class BaseAgent:
    def __init__(self, agent_name: str)
    async def emit_event(event_type, data, job_id, message)
    async def execute(*args, **kwargs)  # Abstract
```

### Hunter Agent Details

**Input**: Job data (title, description, requirements)  
**Output**: List of candidate profiles  
**Processing**:
1. Keyword extraction via Claude function calling
2. Multi-strategy GitHub search:
   - Framework-based search
   - Language-based search
   - Combined keyword search
3. Candidate filtering:
   - Remove organizations
   - Remove bot accounts
   - Filter inactive accounts
   - Quality thresholds (repos > 3, followers 5-1000)

**Events Emitted**:
- `hunter.search_started`
- `hunter.profile_found`
- `hunter.search_completed`

### Analyzer Agent Details

**Input**: Candidate profiles from Hunter  
**Output**: Candidates with analysis data  
**Processing**:
1. Fetch candidate repositories
2. Get commit messages from top repo
3. Build analysis prompt with:
   - Job requirements
   - Candidate profile
   - Repository summaries
   - Commit messages
4. Claude function calling for structured analysis
5. Extract: fit_score, skills, strengths, concerns, top_repositories

**Events Emitted**:
- `analyzer.started`
- `analyzer.repo_analyzed`
- `analyzer.completed`

### Engager Agent Details

**Input**: Analyzed candidates  
**Output**: Candidates with personalized messages  
**Processing**:
1. Build message generation prompt with:
   - Candidate analysis
   - Top project name
   - Job description
   - Company info
2. Claude function calling for message structure
3. Generate: subject line + body (< 200 words)

**Events Emitted**:
- `engager.started`
- `engager.message_generated`

### Orchestrator Details

**Responsibilities**:
1. Queue creation:
   - `hunter_to_analyzer_queue` (asyncio.Queue)
   - `analyzer_to_engager_queue` (asyncio.Queue)
2. Agent task creation:
   - Create async tasks for all three agents
   - Run concurrently (asyncio.create_task)
3. Task coordination:
   - Wait for all tasks to complete
   - Handle errors and cleanup
4. Result persistence:
   - Save candidates to `DBCandidate`
   - Save messages to `DBMessage`
   - Update job status

---

## API Architecture

### REST API Endpoints

#### Jobs

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/api/jobs` | Create job | `JobCreate` | `Job` |
| GET | `/api/jobs` | List jobs | - | `List[Job]` |
| GET | `/api/jobs/{id}` | Get job | - | `Job` |
| POST | `/api/jobs/{id}/start` | Start pipeline | - | `JobStartResponse` |

#### Candidates

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/candidates` | List candidates | `?job_id=` | `List[Candidate]` |
| GET | `/api/candidates/{id}` | Get candidate | - | `Candidate` |
| GET | `/api/candidates/{id}/message` | Get message | - | `OutreachMessage` |

#### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| WS | `/ws/{job_id}` | WebSocket connection |

### WebSocket API

**Connection**: `ws://localhost:8000/ws/{job_id}`

**Event Format**:
```json
{
  "event": "agent.event_type",
  "timestamp": "2024-01-01T00:00:00Z",
  "job_id": "uuid",
  "data": {
    "message": "Human readable message",
    ...additional_data
  }
}
```

**Event Types**:
- `hunter.search_started`
- `hunter.profile_found`
- `hunter.search_completed`
- `analyzer.started`
- `analyzer.repo_analyzed`
- `analyzer.completed`
- `engager.started`
- `engager.message_generated`
- `pipeline.completed`

---

## Frontend Architecture

### Component Hierarchy

```
App
└── Dashboard
    ├── JobForm (when no job)
    └── (when job active)
        ├── HeaderBar
        ├── AgentStatus
        ├── CandidateGrid
        │   └── CandidateCard (multiple)
        └── MetricsPanel
```

### State Management (Zustand)

```javascript
{
  agentStates: {
    hunter: 'idle' | 'active' | 'complete',
    analyzer: 'idle' | 'active' | 'complete',
    engager: 'idle' | 'active' | 'complete'
  },
  candidates: Candidate[],
  events: Event[],
  metrics: {
    totalCandidates: number,
    averageScore: number,
    messagesGenerated: number,
    timeElapsed: number
  },
  currentJob: Job | null
}
```

### WebSocket Integration

1. **Connection**: `useAgentWebSocket(jobId)` hook
2. **Event Handling**:
   - Parse incoming WebSocket events
   - Update Zustand store
   - Trigger React re-renders
3. **Reconnection**: Auto-reconnect on disconnect
4. **Status Tracking**: Connection status displayed in UI

### Styling

- **Framework**: TailwindCSS
- **Theme**: Dark mode
- **Animations**: Framer Motion
- **Responsive**: Mobile-first design
- **Components**: Utility-first CSS classes

---

## Database Schema

### Tables

#### `jobs`

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary key |
| title | String | Job title |
| description | Text | Job description |
| requirements | JSON | List of requirements |
| location | String | Job location |
| company_name | String | Company name |
| company_highlights | JSON | Company highlights |
| status | String | pending/running/completed/failed |
| created_at | DateTime | Creation timestamp |

#### `candidates`

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary key |
| job_id | String (FK) | Foreign key to jobs |
| username | String | GitHub username |
| profile_url | String | GitHub profile URL |
| avatar_url | String | Avatar image URL |
| bio | Text | GitHub bio |
| location | String | Candidate location |
| fit_score | Integer | 0-100 fit score |
| skills | JSON | List of skills |
| strengths | JSON | List of strengths |
| concerns | JSON | List of concerns |
| top_repositories | JSON | Top repositories |
| created_at | DateTime | Creation timestamp |

#### `messages`

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary key |
| candidate_id | String (FK) | Foreign key to candidates |
| subject | String | Email subject line |
| body | Text | Message body |
| generated_at | DateTime | Generation timestamp |

### Relationships

```
Job (1) ──< (Many) Candidate (1) ──< (1) Message
```

---

## Communication Patterns

### 1. REST API (HTTP)

**Request/Response Pattern**:
- Frontend → Backend: REST endpoints
- Synchronous request/response
- JSON payloads

**Example**:
```javascript
// Frontend
const job = await jobsApi.create({
  title: "Senior ML Engineer",
  description: "...",
  company_name: "Acme Corp"
});
```

### 2. WebSocket (Real-time)

**Pub/Sub Pattern**:
- Backend → Frontend: Event broadcasting
- One-to-many (multiple clients per job)
- JSON event format

**Example**:
```python
# Backend
await ws_manager.broadcast(job_id, "hunter.profile_found", {
    "username": "john_doe",
    "url": "https://github.com/john_doe"
})
```

### 3. Queue-based (Agent Communication)

**Producer/Consumer Pattern**:
- Hunter → Analyzer: asyncio.Queue
- Analyzer → Engager: asyncio.Queue
- Asynchronous, non-blocking

**Example**:
```python
# Hunter puts candidate
await output_queue.put(candidate)

# Analyzer gets candidate
candidate = await input_queue.get()
```

### 4. Service Layer (External APIs)

**Adapter Pattern**:
- Agents → Services: Abstracted API calls
- Services → External APIs: HTTP requests
- Error handling and retries

**Example**:
```python
# Agent calls service
repos = await github_service.get_user_repos(username)

# Service calls external API
response = await self.client.get(f"{self.base_url}/users/{username}/repos")
```

---

## Deployment Architecture

### Development

```
Frontend (Vite Dev Server)    Backend (Uvicorn)
     :5173                         :8000
        │                             │
        └──────────┬──────────────────┘
                   │
            SQLite Database
            (lyrathon-wooloolies.db)
```

### Production (Recommended)

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  Static Build (Vite)                         │  │
│  │  - Nginx/Apache                              │  │
│  │  - CDN (optional)                            │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              API Gateway / Load Balancer            │
│  ┌──────────────────────────────────────────────┐  │
│  │  Reverse Proxy (Nginx)                       │  │
│  │  - SSL Termination                           │  │
│  │  - Rate Limiting                             │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐  ┌────▼──────┐  ┌───▼────────┐
│  Backend     │  │  Backend  │  │  Backend   │
│  Instance 1  │  │ Instance 2│  │ Instance N │
│  (FastAPI)   │  │ (FastAPI) │  │ (FastAPI)  │
└───────┬──────┘  └────┬──────┘  └───┬────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐  ┌────▼──────┐  ┌───▼────────┐
│   Database   │  │  Redis    │  │  Message   │
│   (Postgres) │  │  (Cache)  │  │  Queue     │
└──────────────┘  └───────────┘  └────────────┘
```

### Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
APIFY_API_TOKEN=apify_api_...

# Database
DATABASE_URL=postgresql://user:pass@localhost/lyrathon

# Server
BACKEND_PORT=8000
FRONTEND_URL=https://lyrathon.example.com

# Logging
LOG_LEVEL=INFO

# Constraints
MAX_CANDIDATES_PER_JOB=10
```

---

## Scalability Considerations

### Current Limitations

1. **Single Database**: SQLite (file-based, not suitable for production)
2. **No Caching**: Every API call hits external services
3. **No Rate Limiting**: Could exceed GitHub/Claude limits
4. **Single Process**: All agents run in one process
5. **No Load Balancing**: Single backend instance

### Scalability Improvements

1. **Database**: Migrate to PostgreSQL
2. **Caching**: Add Redis for:
   - GitHub API responses
   - Claude API responses
   - Candidate analysis results
3. **Message Queue**: Use RabbitMQ/Celery for:
   - Background job processing
   - Agent task distribution
   - Retry mechanisms
4. **Horizontal Scaling**: 
   - Multiple backend instances
   - Load balancer
   - Session affinity for WebSockets
5. **Rate Limiting**:
   - Token bucket algorithm
   - Per-API-key limits
   - Queue requests when limits hit
6. **Monitoring**:
   - Application metrics (Prometheus)
   - Logging aggregation (ELK stack)
   - Error tracking (Sentry)

---

## Security Considerations

### Current Security Measures

1. **Environment Variables**: API keys stored in .env (not committed)
2. **CORS**: Configured for frontend origin only
3. **Input Validation**: Pydantic models validate all inputs
4. **SQL Injection Protection**: SQLAlchemy ORM uses parameterized queries

### Security Improvements Needed

1. **Authentication**: No user authentication (add OAuth/JWT)
2. **Authorization**: No role-based access control
3. **API Key Rotation**: No mechanism for key rotation
4. **HTTPS**: Development uses HTTP (use HTTPS in production)
5. **Rate Limiting**: Per-user/IP rate limiting
6. **Data Encryption**: Encrypt sensitive data at rest
7. **Audit Logging**: Log all API access and changes

---

## Testing Strategy

### Unit Tests

- Agent logic (mock external APIs)
- Service methods (mock HTTP calls)
- Utility functions
- Data validation (Pydantic models)

### Integration Tests

- API endpoints (test with test database)
- WebSocket connections
- Database operations
- Agent pipeline (end-to-end)

### E2E Tests

- Frontend workflows (Playwright/Cypress)
- Full pipeline execution
- Real-time updates

---

## Future Enhancements

### Phase 1: Core Improvements
- [ ] LinkedIn integration via Apify
- [ ] Email sending (SMTP/SendGrid)
- [ ] PostgreSQL migration
- [ ] Redis caching

### Phase 2: Features
- [ ] Multi-job management
- [ ] Candidate filtering and sorting
- [ ] Export to CSV/PDF
- [ ] Advanced analytics dashboard

### Phase 3: Enterprise
- [ ] User authentication
- [ ] Multi-tenant support
- [ ] ATS integrations
- [ ] Interview scheduling
- [ ] Compensation benchmarking

---

## Conclusion

Lyrathon-Wooloolies is a well-architected multi-agent system that demonstrates modern software engineering practices:

- **Modular Design**: Clear separation of concerns
- **Async Processing**: Efficient concurrent execution
- **Real-time Updates**: WebSocket-based live updates
- **Type Safety**: Pydantic validation throughout
- **Scalable Architecture**: Queue-based agent communication
- **Modern Stack**: FastAPI, React, TailwindCSS

The system successfully automates the recruiting pipeline while maintaining code quality and developer experience.

