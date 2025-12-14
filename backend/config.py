"""
Configuration settings loaded from environment variables.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env files (local first, then project root)
backend_dir = Path(__file__).resolve().parent
env_candidates = [
    backend_dir / ".env",           # backend/.env (local override)
    backend_dir.parent / ".env",    # project root .env
]
for env_path in env_candidates:
    if env_path.exists():
        load_dotenv(env_path, override=False)

class Settings:
    """Application settings"""

    # API Keys
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    APIFY_API_TOKEN: str = os.getenv("APIFY_API_TOKEN", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lyrathon-wooloolies.db")

    # Server
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development, production

    # Constraints
    MAX_CANDIDATES_PER_JOB: int = int(os.getenv("MAX_CANDIDATES_PER_JOB", "10"))

    # LLM Provider Configuration
    MODEL_PROVIDER: str = os.getenv("MODEL_PROVIDER", "claude")  # Options: "claude" or "gemini"

    # Claude Configuration
    CLAUDE_MODEL: str = "claude-sonnet-4-5-20250929"

    # Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def validate(self):
        """Validate that required settings are present"""
        # Validate MODEL_PROVIDER value
        if self.MODEL_PROVIDER not in ["claude", "gemini"]:
            raise ValueError(f"Invalid MODEL_PROVIDER: {self.MODEL_PROVIDER}. Must be 'claude' or 'gemini'")

        # Common required API keys
        missing = []
        if not self.GITHUB_TOKEN:
            missing.append("GITHUB_TOKEN")

        # Provider-specific API key validation
        if self.MODEL_PROVIDER == "claude" and not self.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY (required for MODEL_PROVIDER=claude)")
        elif self.MODEL_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY (required for MODEL_PROVIDER=gemini)")

        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

# Global settings instance
settings = Settings()
