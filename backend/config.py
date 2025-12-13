"""
Configuration settings loaded from environment variables.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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

    # Constraints
    MAX_CANDIDATES_PER_JOB: int = int(os.getenv("MAX_CANDIDATES_PER_JOB", "10"))
    CLAUDE_MODEL: str = "claude-sonnet-4-5-20250929"

    def validate(self):
        """Validate that required settings are present"""
        missing = []
        if not self.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY")
        if not self.APIFY_API_TOKEN:
            missing.append("APIFY_API_TOKEN")
        if not self.GITHUB_TOKEN:
            missing.append("GITHUB_TOKEN")

        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

# Global settings instance
settings = Settings()
