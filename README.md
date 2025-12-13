# Autonomous Recruiting Agent Swarm 🤖

An AI-powered multi-agent system that autonomously finds, evaluates, and engages tech talent in real-time.

Built for the Lyrathon hackathon to solve the tech talent acquisition crisis.

## ✨ Features

- **Hunter Agent**: Searches GitHub for candidates matching job requirements
- **Analyzer Agent**: Uses Claude AI to evaluate code quality and generate fit scores (0-100)
- **Engager Agent**: Generates personalized outreach messages mentioning specific projects
- **Real-time Dashboard**: Live WebSocket updates showing agent activity as it happens
- **Beautiful UI**: Modern dark theme with animations powered by Framer Motion

## 🎯 The Problem We Solve

- 49 days average time-to-hire for senior engineers
- $1-10M sign-on bonuses for top AI talent
- 73% of recruiters struggle to find qualified candidates
- Manual recruiting is slow and inefficient

## 💡 Our Solution

Three AI agents working autonomously in a pipeline:
1. **Hunter** finds candidates on GitHub based on job requirements
2. **Analyzer** evaluates their skills using Claude AI and GitHub data
3. **Engager** generates personalized messages referencing their actual work

All in real-time, visible on a live dashboard.

## 🛠 Tech Stack

**Backend:**
- Python 3.11, FastAPI
- Anthropic Claude API (Sonnet 4.5)
- GitHub REST API
- SQLite + SQLAlchemy
- WebSockets for real-time updates

**Frontend:**
- React 18, Next.js 13 App Router (TypeScript)
- Zustand (state management)
- TailwindCSS (styling)
- Framer Motion (animations)
- React-use-websocket

## 🚀 Quick Start

### Prerequisites

1. **Python 3.11+** and **Node.js 18+**
2. **API Keys** (required):
   - [Anthropic Claude API key](https://console.anthropic.com/)
   - [GitHub Personal Access Token](https://github.com/settings/tokens/new) (scopes: `public_repo`, `read:user`)
   - [Apify API token](https://apify.com/) (optional for demo)

### Installation

1. **Clone and setup environment variables:**
```bash
cd lyrathon-wooloolies
cp .env.example .env
# Edit .env and add your API keys
```

2. **Backend setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r ../requirements.txt
```

3. **Frontend setup:**
```bash
cd frontend
pnpm install
```

### Running the Application

**Monorepo (pnpm + turbo)**
```bash
pnpm install
pnpm dev
# Runs backend (uv run python run.py) and frontend (pnpm dev) together
```

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python run.py
# Server will start on http://localhost:8000
```

**Terminal 2 - Frontend (Next.js):**
```bash
cd frontend
pnpm dev
# Dev server will start on http://localhost:3000
```

**Open:** http://localhost:3000

## 📖 Usage

1. **Enter job details:**
   - Job title (e.g., "Senior ML Engineer")
   - Company name
   - Location (optional)
   - Job description (be specific about skills needed)

2. **Click "Start Recruiting"**

3. **Watch the magic happen:**
   - Hunter agent searches GitHub
   - Analyzer agent evaluates each candidate
   - Engager agent generates personalized messages
   - All updates stream live to your dashboard

4. **Review results:**
   - View candidate cards with scores and skills
   - Read personalized outreach messages
   - Check metrics (avg score, candidates found, etc.)

## 🎬 Demo Script (4 minutes)

See `demo_job.md` for pre-written job descriptions.

**Minute 0-1:** Problem introduction + solution overview
**Minute 1-3:** Live demo - paste job description, watch agents work
**Minute 3-4:** Results showcase - highlight personalization + impact

## 📊 API Endpoints

Swagger UI available at: http://localhost:8000/docs

- `POST /api/jobs` - Create recruiting job
- `POST /api/jobs/{id}/start` - Start agent pipeline
- `GET /api/candidates` - List candidates
- `GET /api/candidates/{id}/message` - Get outreach message
- `WS /ws/{job_id}` - WebSocket for real-time updates

## 🧪 Testing

See `TESTING.md` for comprehensive testing guide.

Quick test:
```bash
# Backend running? Check health
curl http://localhost:8000/health

# Frontend running?
open http://localhost:3000
```

## 📁 Project Structure

```
lyrathon-wooloolies/
├── backend/
│   ├── agents/          # Hunter, Analyzer, Engager + Orchestrator
│   ├── services/        # Claude, GitHub, Apify, WebSocket
│   ├── api/             # (unused - routes in main.py)
│   ├── main.py          # FastAPI app + REST endpoints
│   ├── database.py      # SQLAlchemy models
│   ├── models.py        # Pydantic schemas
│   └── config.py        # Environment variables
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js App Router entry (layout, page)
│   │   ├── components/  # Dashboard, JobForm, AgentStatus, etc.
│   │   ├── hooks/       # useWebSocket
│   │   ├── store/       # Zustand state management
│   │   └── api/         # Axios client
│   └── tsconfig.json    # Path alias @/* -> src/*
├── demo_job.md          # Sample job descriptions
├── TESTING.md           # Testing guide
└── README.md            # This file
```

## 🐛 Troubleshooting

**No candidates found:**
- Check GitHub token in .env
- Try broader job description
- Check backend logs for errors

**Claude API errors:**
- Verify ANTHROPIC_API_KEY
- Check credit balance
- Ensure API key has correct permissions

**WebSocket disconnected:**
- Restart backend server
- Check CORS settings
- Refresh frontend

**More help:** See `TESTING.md` troubleshooting section

## 🎯 Success Metrics

A successful run shows:
- ✅ 5-10+ candidates found
- ✅ Fit scores varying (50-95 range)
- ✅ Skills relevant to job description
- ✅ Messages mention specific GitHub projects
- ✅ Pipeline completes in 1-2 minutes
- ✅ Real-time updates visible throughout

## 🔮 Future Enhancements

- [ ] LinkedIn integration via Apify
- [ ] Email sending (SMTP integration)
- [ ] Multi-job management dashboard
- [ ] Candidate filtering and sorting
- [ ] Export to CSV
- [ ] Advanced analytics
- [ ] Interview scheduling integration

## 👥 Team

Built for Lyrathon 2025

## 📄 License

MIT
