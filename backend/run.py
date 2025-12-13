"""
Simple script to run the FastAPI backend server.
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    from config import settings

    print("=" * 60)
    print("🚀 Starting Autonomous Recruiting Agent Swarm Backend")
    print("=" * 60)
    print(f"Server: http://localhost:{settings.BACKEND_PORT}")
    print(f"API Docs: http://localhost:{settings.BACKEND_PORT}/docs")
    print(f"Frontend: {settings.FRONTEND_URL}")
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.BACKEND_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
