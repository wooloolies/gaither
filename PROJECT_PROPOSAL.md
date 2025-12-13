# Lyrathon-Wooloolies Project Proposal
## Autonomous Recruiting Agent Swarm

---

## #1 Executive Summary – Identity

### Project Name
**Lyrathon-Wooloolies** - Autonomous Recruiting Agent Swarm

### Slogan
*"From Job Post to Personalized Outreach in Minutes, Not Days"*

### Core Technology Stack

**Backend:**
- Python 3.11+ with FastAPI (async REST API)
- Anthropic Claude Sonnet 4.5 (AI-powered analysis & generation)
- GitHub REST API (candidate discovery)
- SQLite + SQLAlchemy (data persistence)
- WebSockets (real-time communication)

**Frontend:**
- React 18 with Vite (modern UI framework)
- Zustand (lightweight state management)
- TailwindCSS (utility-first styling)
- Framer Motion (smooth animations)
- React-use-websocket (real-time updates)

**Architecture:**
- Multi-agent system with asyncio queues
- Event-driven pipeline orchestration
- Real-time WebSocket broadcasting

### Mission Statement

**To revolutionize tech talent acquisition by automating the entire recruiting pipeline—from candidate discovery to personalized outreach—reducing time-to-hire from 49 days to minutes while maintaining quality and personalization.**

We address the critical pain points in the tech recruiting crisis:
- **For Companies**: Reduce time-to-hire, improve candidate quality matching, compete with tech giants
- **For Candidates**: Receive relevant, personalized opportunities instead of spam
- **For the Industry**: Create efficient talent-market matching, democratize access to opportunities

---

## #2 Strategic Analysis

### Framework: SWOT Analysis

#### Strengths
1. **Multi-Agent Architecture**: Three specialized AI agents (Hunter, Analyzer, Engager) working autonomously in parallel
2. **Real-Time Visibility**: Live dashboard with WebSocket updates showing agent activity as it happens
3. **AI-Powered Personalization**: Claude AI generates context-aware messages mentioning specific GitHub projects
4. **Technical Depth**: Demonstrates advanced async Python, API integration, and modern React patterns
5. **Working Prototype**: Fully functional end-to-end system, not just mockups

#### Weaknesses
1. **Limited Data Sources**: Currently only GitHub (LinkedIn integration via Apify is placeholder)
2. **No Email Sending**: Messages generated but not automatically sent
3. **Single Job Processing**: No multi-job management or batch processing
4. **Basic Filtering**: Limited candidate filtering and sorting capabilities
5. **No Compensation Data**: Doesn't address market dynamics/compensation benchmarking

#### Opportunities
1. **Market Need**: 73% of recruiters struggle to find qualified talent; 49-day average time-to-hire
2. **AI Adoption**: Growing acceptance of AI in recruiting workflows
3. **API Ecosystem**: Rich APIs available (GitHub, LinkedIn via Apify, email services)
4. **Scalability**: Architecture supports adding more agents and data sources
5. **Integration Potential**: Can integrate with ATS systems, email platforms, scheduling tools

#### Threats
1. **API Rate Limits**: GitHub API has rate limits; Claude API costs scale with usage
2. **Data Privacy**: Handling candidate data requires compliance considerations
3. **Competition**: Established players (LinkedIn Recruiter, Greenhouse, Lever)
4. **Quality Control**: AI-generated messages need human review before sending
5. **Technical Complexity**: Multi-agent systems require careful error handling and monitoring

### Strategic Positioning

**Target Market**: Mid-to-large tech companies, recruiting agencies, and startups competing for engineering talent.

**Competitive Advantage**:
- **Speed**: Complete pipeline in 1-2 minutes vs. 49-day industry average
- **Personalization**: AI-generated messages reference actual GitHub projects, not templates
- **Transparency**: Real-time visibility into the entire process
- **Cost-Effective**: Automated pipeline reduces recruiter time investment

**Value Proposition**:
1. **Reduce Time-to-Hire**: From weeks to minutes for candidate discovery and initial outreach
2. **Improve Match Quality**: AI analysis evaluates actual code quality, not just keywords
3. **Scale Operations**: One recruiter can process multiple jobs simultaneously
4. **Better Candidate Experience**: Personalized, relevant messages increase response rates

---

## #3 Killer Features

### Feature 1: Autonomous Multi-Agent Pipeline
**Concept**: Three specialized AI agents work concurrently, each handling a specific stage of recruiting.

**Implementation**:
- **Hunter Agent**: Uses Claude to extract keywords from job descriptions, builds GitHub search queries, discovers candidates matching requirements
- **Analyzer Agent**: Fetches candidate repositories, analyzes code quality using Claude, generates fit scores (0-100) and skill assessments
- **Engager Agent**: Generates personalized outreach messages using Claude, mentioning specific projects and connecting skills to role needs

**Technical Details**:
- Asyncio queues for inter-agent communication
- Orchestrator coordinates pipeline execution
- Error handling with fallback mechanisms
- Rate limiting and API cost management

### Feature 2: Real-Time Live Dashboard
**Concept**: WebSocket-powered dashboard showing agent activity as it happens, not after completion.

**Implementation**:
- WebSocket manager broadcasts events from all agents
- React frontend subscribes to job-specific WebSocket streams
- Live updates include:
  - Candidate discovery notifications
  - Analysis progress with fit scores
  - Message generation status
  - Pipeline completion metrics

**Technical Details**:
- FastAPI WebSocket endpoint (`/ws/{job_id}`)
- Event-driven architecture with structured event types
- Zustand store manages real-time state
- Framer Motion animations for smooth UX

### Feature 3: AI-Powered Candidate Analysis
**Concept**: Deep analysis of candidate GitHub profiles, evaluating actual code quality and project relevance.

**Implementation**:
- Fetches top repositories for each candidate
- Analyzes commit history, code patterns, project complexity
- Claude AI evaluates:
  - Technical skills alignment with job requirements
  - Code quality and best practices
  - Project relevance and impact
  - Overall fit score (0-100)
- Generates structured analysis with strengths, skills, and recommendations

**Technical Details**:
- GitHub API integration for repository data
- Claude function calling for structured JSON output
- Caching to reduce API calls
- Fallback analysis if data unavailable

### Feature 4: Personalized Message Generation
**Concept**: AI-generated outreach messages that feel personal, not templated, by referencing specific candidate work.

**Implementation**:
- Claude AI generates messages using:
  - Candidate's top GitHub projects (mentioned by name)
  - Specific skills and strengths from analysis
  - Job requirements and company context
  - Professional but warm tone
- Structured output: subject line + body (under 200 words)
- Quality requirements: mentions specific project, connects skills to role, includes call-to-action

**Technical Details**:
- Claude function calling with JSON schema validation
- Error handling with fallback generic messages
- Message storage in database for retrieval
- API endpoint for message access (`/api/candidates/{id}/message`)

### Feature 5: Modern, Beautiful UI
**Concept**: Dark-themed dashboard with smooth animations, real-time updates, and intuitive candidate cards.

**Implementation**:
- **Job Form**: Clean input for job title, company, description
- **Agent Status Panel**: Shows current agent activity with icons and progress
- **Candidate Grid**: Cards displaying:
  - Avatar, username, profile link
  - Fit score with color coding
  - Skills tags
  - Analysis summary
  - Generated message preview
- **Metrics Panel**: Real-time stats (candidates found, avg score, messages generated)
- **Animations**: Framer Motion for smooth transitions and loading states

**Technical Details**:
- TailwindCSS for responsive, modern styling
- Component-based React architecture
- Zustand for global state management
- WebSocket hook for real-time subscriptions

---

## #4 Timeline – Two-Day Sprint

### Day 1: Core Pipeline Development

**Morning (4 hours) - Backend Foundation**
- [ ] Set up FastAPI project structure
- [ ] Implement database models (Job, Candidate, Message)
- [ ] Create base agent class with event emission
- [ ] Implement GitHub service with authentication
- [ ] Set up Claude service with function calling

**Afternoon (4 hours) - Agent Implementation**
- [ ] Build Hunter Agent (keyword extraction + GitHub search)
- [ ] Build Analyzer Agent (repository analysis + fit scoring)
- [ ] Build Engager Agent (message generation)
- [ ] Create Orchestrator (queue management + agent coordination)
- [ ] Implement WebSocket manager for real-time events

**Evening (2 hours) - Integration & Testing**
- [ ] Connect agents in pipeline
- [ ] Test end-to-end flow with sample job
- [ ] Fix bugs and error handling
- [ ] Add logging and monitoring

### Day 2: Frontend & Polish

**Morning (4 hours) - Frontend Core**
- [ ] Set up React + Vite project
- [ ] Implement WebSocket hook for real-time updates
- [ ] Create Zustand store for state management
- [ ] Build JobForm component
- [ ] Build AgentStatus component

**Afternoon (4 hours) - UI Components**
- [ ] Create CandidateCard component with animations
- [ ] Build CandidateGrid with responsive layout
- [ ] Implement MetricsPanel
- [ ] Create Dashboard layout with routing
- [ ] Add TailwindCSS styling and dark theme

**Evening (2 hours) - Integration & Demo Prep**
- [ ] Connect frontend to backend API
- [ ] Test WebSocket real-time updates
- [ ] Polish animations and UX
- [ ] Prepare demo job descriptions
- [ ] Create 4-minute pitch script
- [ ] Final testing and bug fixes

---

## #5 Action Items

### Frontend Engineer

**Day 1:**
- [ ] Set up React + Vite project with TailwindCSS
- [ ] Create project structure (components, hooks, store, api)
- [ ] Implement WebSocket hook (`useWebSocket.js`)
- [ ] Set up Zustand store (`agentStore.js`)
- [ ] Create API client for REST endpoints
- [ ] Build basic JobForm component

**Day 2:**
- [ ] Build AgentStatus component (shows current agent activity)
- [ ] Create CandidateCard component with:
  - Avatar, username, profile link
  - Fit score display with color coding
  - Skills tags
  - Message preview
  - Framer Motion animations
- [ ] Build CandidateGrid (responsive grid layout)
- [ ] Create MetricsPanel (stats display)
- [ ] Build Dashboard layout (combines all components)
- [ ] Add dark theme styling
- [ ] Implement real-time WebSocket updates
- [ ] Polish animations and transitions

**Deliverables:**
- Fully functional React dashboard
- Real-time WebSocket integration
- Responsive, animated UI
- Dark theme with modern design

### Backend Engineer

**Day 1:**
- [ ] Set up FastAPI project structure
- [ ] Create database models (SQLAlchemy):
  - DBJob (id, title, company_name, description, status, created_at)
  - DBCandidate (id, job_id, username, profile_url, fit_score, analysis JSON)
  - DBMessage (id, candidate_id, subject, body, generated_at)
- [ ] Implement database initialization and migrations
- [ ] Create base agent class (`BaseAgent`) with:
  - Event emission to WebSocket manager
  - Logging setup
  - Common utilities
- [ ] Build GitHub service:
  - Authentication with token
  - `search_users()` method
  - `get_user()` method
  - `get_user_repos()` method
  - Error handling and rate limiting
- [ ] Build Claude service:
  - `function_call()` for structured output
  - `analyze()` for text analysis
  - Error handling

**Day 2:**
- [ ] Implement Hunter Agent:
  - `_extract_keywords()` using Claude
  - `_search_github()` with query building
  - Queue management
- [ ] Implement Analyzer Agent:
  - `_analyze_candidate()` using Claude
  - Repository fetching and analysis
  - Fit score calculation
- [ ] Implement Engager Agent:
  - `_generate_message()` using Claude
  - Message personalization
- [ ] Create Orchestrator:
  - Queue creation and management
  - Agent task coordination
  - Result saving to database
- [ ] Implement WebSocket manager:
  - Connection management
  - Event broadcasting
- [ ] Create REST API endpoints:
  - `POST /api/jobs` (create job)
  - `POST /api/jobs/{id}/start` (start pipeline)
  - `GET /api/candidates` (list candidates)
  - `GET /api/candidates/{id}/message` (get message)
  - `WS /ws/{job_id}` (WebSocket endpoint)
- [ ] Add error handling, logging, and monitoring

**Deliverables:**
- Fully functional FastAPI backend
- Three working agents with orchestration
- REST API and WebSocket endpoints
- Database persistence

### AI Engineer

**Day 1:**
- [ ] Design Claude prompts for keyword extraction:
  - Input: Job description
  - Output: Structured keywords (languages, frameworks, domains)
  - JSON schema definition
- [ ] Design Claude prompts for candidate analysis:
  - Input: Candidate profile + repositories
  - Output: Fit score, skills, strengths, top repos
  - Evaluation criteria and scoring logic
- [ ] Design Claude prompts for message generation:
  - Input: Candidate analysis + job data
  - Output: Subject + body (personalized)
  - Tone and style guidelines
- [ ] Test and refine prompts for quality
- [ ] Implement function calling schemas for all three use cases
- [ ] Add error handling and fallback responses

**Day 2:**
- [ ] Optimize prompts for:
  - Response quality
  - Token efficiency
  - Consistency
- [ ] Implement prompt versioning and testing
- [ ] Add prompt templates for different job types
- [ ] Create evaluation metrics for:
  - Message quality (relevance, personalization)
  - Analysis accuracy (fit score validation)
  - Keyword extraction precision
- [ ] Document prompt engineering decisions
- [ ] Prepare demo scenarios with optimal prompts

**Deliverables:**
- Optimized Claude prompts for all three agents
- JSON schemas for structured output
- Quality evaluation framework
- Documentation of AI decisions

### Designer

**Day 1:**
- [ ] Design system:
  - Color palette (dark theme)
  - Typography (font choices, sizes)
  - Component library (buttons, cards, inputs)
  - Icon system
- [ ] Create wireframes for:
  - Dashboard layout
  - Job form
  - Candidate cards
  - Agent status panel
  - Metrics display
- [ ] Design user flow:
  - Job creation → Pipeline start → Results view
  - Real-time update states
  - Loading and error states
- [ ] Create design mockups (Figma/Sketch)

**Day 2:**
- [ ] Design animations:
  - Candidate card entrance
  - Agent status transitions
  - Loading spinners
  - Progress indicators
- [ ] Create responsive breakpoints:
  - Desktop (1920px, 1440px)
  - Tablet (768px)
  - Mobile (375px)
- [ ] Design empty states and error messages
- [ ] Create icon set (agent icons, status icons)
- [ ] Provide design tokens for TailwindCSS:
  - Colors, spacing, typography
  - Animation durations
- [ ] Review implemented UI and provide feedback

**Deliverables:**
- Complete design system
- Wireframes and mockups
- Animation specifications
- Design tokens for implementation
- Responsive design guidelines

---

## Success Criteria

### Technical Metrics
- ✅ Pipeline completes in 1-2 minutes for 10 candidates
- ✅ Real-time updates visible within 1 second
- ✅ 95%+ API success rate (GitHub, Claude)
- ✅ Zero critical bugs in demo flow

### Quality Metrics
- ✅ Fit scores range 50-95 (realistic distribution)
- ✅ Messages mention specific GitHub projects
- ✅ Skills extracted match job requirements
- ✅ Messages under 200 words, professional tone

### Demo Metrics
- ✅ 4-minute pitch demonstrates full pipeline
- ✅ Live demo shows real-time agent activity
- ✅ Results showcase personalization quality
- ✅ UI is polished and professional

---

## Risk Mitigation

1. **API Failures**: Implement retry logic, fallback messages, graceful degradation
2. **Rate Limits**: Add rate limiting, caching, request queuing
3. **AI Quality**: Test prompts extensively, provide fallback templates
4. **WebSocket Issues**: Add reconnection logic, connection health checks
5. **Time Constraints**: Prioritize core features, defer nice-to-haves

---

## Future Enhancements (Post-Hackathon)

- [ ] LinkedIn integration via Apify
- [ ] Email sending (SMTP/SendGrid integration)
- [ ] Multi-job management dashboard
- [ ] Advanced candidate filtering and sorting
- [ ] Export to CSV/PDF
- [ ] Interview scheduling integration
- [ ] Compensation benchmarking
- [ ] ATS system integrations
- [ ] Analytics and reporting dashboard

---

**Project Status**: ✅ Working Prototype  
**Demo Ready**: ✅ Yes  
**Pitch Time**: 4 minutes  
**Team**: Full-stack development team
