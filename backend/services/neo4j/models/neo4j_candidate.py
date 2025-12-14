from dataclasses import dataclass, field

@dataclass
class Neo4jCandidate:
    id: str  # candidate_id
    username: str # github username
    location: str = field(default=None)
    top_repo: list[str] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    education: list[str] = field(default_factory=list)
    