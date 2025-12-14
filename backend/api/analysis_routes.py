from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict

from services.github_service import github_service
from services.llm import get_llm_service
from config import settings
import logging

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

class RepoAnalysisRequest(BaseModel):
    repo_url: str

class RepoAnalysisResponse(BaseModel):
    analysis: str
    
@router.post("/analysis/repo", response_model=RepoAnalysisResponse, tags=["Analysis"])
async def analyze_repo(request: RepoAnalysisRequest):
    """
    Analyze a GitHub repository using LLM.
    """
    try:
        if "github.com/" not in request.repo_url:
            raise HTTPException(status_code=400, detail="Invalid GitHub URL")

        # Extract owner and repo name
        parts = request.repo_url.split("github.com/")[-1].split("/")
        if len(parts) < 2:
             raise HTTPException(status_code=400, detail="Invalid GitHub URL format")
        
        username = parts[0]
        repo_name = parts[1]
        
        # Fetch README
        readme_content = await github_service.get_repo_readme(username, repo_name)
        
        # Get analysis using structured helper
        analysis_result = await _llm_analyze_repo(username, repo_name, readme_content)
        
        return RepoAnalysisResponse(analysis=analysis_result)

    except Exception as e:
        logger.error(f"Error analyzing repo {request.repo_url}: {e}")
        # Return a friendly error instead of 500
        return RepoAnalysisResponse(analysis=f"Unable to analyze repository at this time. Error: {str(e)}")


async def _llm_analyze_repo(username: str, repo_name: str, readme_content: str) -> str:
    """
    Analyze repository using LLM with structured output, then format as text.
    """
    try:
        context = f"Repository: {username}/{repo_name}\n"
        if readme_content:
             # Truncate README to 3000 chars to fit context window comfortably
            context += f"README Content (first 3000 chars):\n{readme_content[:3000]}..."
        else:
            context += "No README found."

        prompt = f"""
        Analyze this GitHub repository as a Senior Software Engineer.
        
        {context}
        
        Provide a technical assessment covering:
        1. Core Functionality: What does it do?
        2. Tech Stack: Languages, frameworks, key libraries.
        3. Code Quality/Complexity: Estimated complexity and potential quality indicators (badges, documentation quality).
        4. Practical Utility: Who is this for? Is it production-ready or a toy project?
        5. Pros & Cons: Key strengths and weaknesses.
        """

        schema = {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "2-3 sentence executive summary of what the repo does"
                },
                "tech_stack": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of key technologies used (max 5)"
                },
                "complexity_level": {
                    "type": "string",
                    "enum": ["Low", "Medium", "High", "Very High"],
                    "description": "Estimated technical complexity"
                },
                "utility_score": {
                    "type": "integer",
                    "description": "Practical utility score 1-10"
                },
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of 3 key strengths"
                },
                "weaknesses": {
                     "type": "array",
                    "items": {"type": "string"},
                    "description": "List of 1-3 potential weaknesses or missing features"
                }
            },
            "required": ["summary", "tech_stack", "complexity_level", "utility_score", "strengths"]
        }

        # Get LLM service
        llm_service = get_llm_service("gemini") 
        
        # Use function calling for structured analysis
        result = await llm_service.function_call(
            prompt=prompt,
            function_name="analyze_repository",
            schema=schema
        )
        
        # Format the structured result into a nice string for the frontend
        formatted_analysis = f"""
**Summary**
{result.get('summary', 'No summary available.')}

**Tech Stack**
{', '.join(result.get('tech_stack', []))}

**Assessment**
- **Complexity**: {result.get('complexity_level', 'Unknown')}
- **Utility Score**: {result.get('utility_score', '?')}/10

**Strengths**
{chr(10).join([f'- {s}' for s in result.get('strengths', [])])}

**Areas for Improvement**
{chr(10).join([f'- {w}' for w in result.get('weaknesses', [])])}
        """.strip()
        
        return formatted_analysis

    except Exception as e:
        logger.error(f"Structured analysis failed: {e}")
        # Fallback to simple text generation if function call fails
        try:
             llm_service = get_llm_service("gemini")
             return await llm_service.analyze(f"Summarize this repo: {username}/{repo_name}")
        except:
            return "Analysis currently unavailable."
