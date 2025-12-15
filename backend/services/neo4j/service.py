"""
Neo4j Graph Database Service for candidate relationships.

This service handles storing and retrieving candidate information with graph
capabilities. It manages nodes and relationships for candidate profiles.
"""

import os
from typing import Any, Dict, List, Optional, Union
from dataclasses import asdict
from neo4j import GraphDatabase
from loguru import logger
from .models.neo4j_models import CandidateGraph, CandidatePath, Neo4jNode, Neo4jRelationship
from .models.neo4j_candidate import Neo4jCandidate


class Neo4jService:
    """Service for managing candidate data in Neo4j graph database."""

    def __init__(self):
        """Initialize Neo4j driver and verify connection."""
        self.driver = None
        self._connect()

    def _connect(self):
        """Connect to Neo4j instance."""
        try:
            neo4j_uri = os.environ.get("NEO4J_URI")
            neo4j_user = os.environ.get("NEO4J_USERNAME")
            neo4j_password = os.environ.get("NEO4J_PASSWORD")

            if not neo4j_uri or not neo4j_user or not neo4j_password:
                raise ValueError(
                    "NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set in environment"
                )

            self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

            # Verify connection
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                result.single()

            logger.info("Successfully connected to Neo4j")

        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    def _process_graph_result(self, result) -> CandidateGraph:
        """
        Helper method to process Neo4j result into a CandidateGraph.

        Args:
            result: Neo4j execution result

        Returns:
            CandidateGraph containing all paths found
        """
        graph = CandidateGraph()
        
        for record in result:
            path = record["p"]
            if path:
                nodes = []
                for node in path.nodes:
                    nodes.append(Neo4jNode(
                        element_id=node.element_id,
                        labels=set(node.labels),
                        properties=dict(node)
                    ))
                
                relationships = []
                for rel in path.relationships:
                    relationships.append(Neo4jRelationship(
                        element_id=rel.element_id,
                        type=rel.type,
                        start_node_id=rel.start_node.element_id,
                        end_node_id=rel.end_node.element_id,
                        properties=dict(rel)
                    ))
                    
                graph.paths.append(CandidatePath(
                    nodes=nodes,
                    relationships=relationships,
                    length=len(path)
                ))
        return graph

    def get_candidate_by_id(self, candidate_id: str) -> Optional[CandidateGraph]:
        """
        Get a candidate by their candidate_id.

        Args:
            candidate_id: Unique candidate ID from candidate

        Returns:
            CandidateGraph containing all paths found, or None if error
        """
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (n:User {candidateId: $candidate_id})
                    OPTIONAL MATCH p=(n)-[r*1..2]-(m)
                    RETURN p
                    LIMIT 50
                    """,
                    candidate_id=candidate_id
                )
                return self._process_graph_result(result)

        except Exception as e:
            logger.error(f"Failed to get candidate id {candidate_id}: {e}")
            return None

    def get_candidate_by_username(self, username: str) -> Optional[CandidateGraph]:
        """
        Get candidate graph by username.

        Args:
            username: Unique username from database

        Returns:
            CandidateGraph containing all paths found
        """
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (n:User {username: $username})
                    OPTIONAL MATCH p=(n)-[r*1..2]-(m)
                    RETURN p
                    LIMIT 50
                    """,
                    username=username
                )
                return self._process_graph_result(result)

        except Exception as e:
            logger.error(f"Failed to get candidate {username}: {e}")
            return None

    def store_candidate(
        self,
        candidate_id: str,
        job_id: str,
        username: str,
        profile_url: str,
        strengths: List[str],
        concerns: List[str],
        skills: List[str],
        fit_score: int,
        location: Optional[str] = None,
        bio: Optional[str] = None,
        top_repo: Union[List[str], List[Dict[str, Any]]] = [],
        education: List[str] = [],
    ) -> str:
        """
        Store or update a candidate in Neo4j using dynamic query building.

        Args:
            candidate_id: Unique candidate ID
            job_id: Associated job ID
            username: GitHub username
            profile_url: GitHub profile URL
            strengths: List of candidate strengths
            concerns: List of candidate concerns
            skills: List of skills
            fit_score: Overall fit score (0-100)
            location: Candidate location
            bio: Candidate bio
            top_repo: List of top repositories (strings or dicts with 'name' key)
            education: List of education entries

        Returns:
            Candidate ID (username in this case as it is the primary key for User)
        """
        try:
            # Create input object
            candidate_input = Neo4jCandidate(
                id=candidate_id,  # Map candidate_id to id
                username=username,
                location=location,
                skills=skills,
                top_repo=top_repo,
                education=education
            )
            
            # Convert dataclass to dict for params
            params = asdict(candidate_input)
            
            # Build query conditionally - only include fields that are not None/empty
            query_parts = ["MERGE (u:User {username: $username})"]
            
            # Update User properties - only candidateId is kept on the model
            query_parts.append("""
            SET u.candidateId = $id
            """)

            # Handle Location (only if not None and not empty)
            location = params.get('location')
            if location is not None and location:
                query_parts.append("""
            MERGE (l:Location {name: $location})
            MERGE (u)-[:LOCATED_IN]->(l)""")
            
            # Handle Repos (top_repo)
            # top_repo can be a list of strings or dicts with 'name' key
            raw_repos = params.get('top_repo', [])
            top_repo = []
            for item in raw_repos:
                if isinstance(item, dict):
                    # Extract name from dict
                    repo_name = item.get('name', '')
                    if repo_name and repo_name.strip():
                        top_repo.append(repo_name.strip())
                elif isinstance(item, str) and item.strip():
                    top_repo.append(item.strip())
            
            if top_repo:
                query_parts.append("""
            FOREACH (repo_name IN $top_repo | 
                MERGE (r:Repo {name: repo_name})
                MERGE (u)-[:HAS_TOP_REPO]->(r)
            )""")
                params['top_repo'] = top_repo
            
            # Handle Skills
            skills = [item for item in params.get('skills', []) if item and item.strip()]
            if skills:
                query_parts.append("""
            FOREACH (skill_name IN $skills |
                MERGE (s:Skill {name: skill_name})
                MERGE (u)-[:HAS_SKILL]->(s)
            )""")
                params['skills'] = skills
            
            # Handle Education
            education = [item for item in params.get('education', []) if item and item.strip()]
            if education:
                query_parts.append("""
            FOREACH (edu_name IN $education | 
                MERGE (e:Education {name: edu_name})
                MERGE (u)-[:HAS_EDUCATION]->(e)
            )""")
                params['education'] = education

            # Combine all query parts
            query = "\n".join(query_parts)
            
            # Clean params
            params = {k: v for k, v in params.items() if v is not None and v != []}
            
            with self.driver.session() as session:
                session.run(query, **params)
                logger.info(f"Stored/updated candidate {username} (ID: {candidate_id}) in Neo4j")
                return candidate_id

        except Exception as e:
            logger.error(f"Failed to store candidate {candidate_id}: {e}")
            raise

    def get_all_candidates(self) -> CandidateGraph:
        """
        Get all candidates and their relationships (limited).

        Returns:
            CandidateGraph containing all paths found
        """
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH p=()-[]->() 
                    RETURN p 
                    LIMIT 50
                    """
                )
                return self._process_graph_result(result)

        except Exception as e:
            logger.error(f"Failed to get all candidates: {e}")
            return CandidateGraph()

    def get_graph_by_filter(self, filter_type: str, value: str) -> CandidateGraph:
        """
        Get graph centered on a filter node (Skill, Location, etc.) showing connected Users.

        Args:
            filter_type: Type of filter ('skill', 'location', 'education', 'repo')
            value: Value to filter by (e.g., 'Python', 'San Francisco', 'MIT')

        Returns:
            CandidateGraph containing paths from Users to the Filter Node
        """
        filter_map = {
            "skill": ("Skill", "HAS_SKILL"),
            "location": ("Location", "LOCATED_IN"),
            "education": ("Education", "HAS_EDUCATION"),
            "repo": ("Repo", "HAS_TOP_REPO")
        }

        if filter_type.lower() not in filter_map:
            logger.warning(f"Invalid filter type: {filter_type}")
            return CandidateGraph()

        node_label, rel_type = filter_map[filter_type.lower()]

        try:
            with self.driver.session() as session:
                # Dynamically construct query based on mapped types
                # We can construct the string safely because map values are hardcoded internal strings
                query = f"""
                    MATCH (f:{node_label} {{name: $value}})
                    MATCH p = (u:User)-[r:{rel_type}]->(f)
                    RETURN p
                    LIMIT 50
                """
                logger.info(f"Executing Cypher query for filter {filter_type}={value}:\n{query}")
                result = session.run(query, value=value)
                return self._process_graph_result(result)

        except Exception as e:
            logger.error(f"Failed to get graph by filter {filter_type}={value}: {e}")
            return CandidateGraph()
        
    def delete_by_id(self, candidate_id: str):
        try:
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (c:User {candidateId: $candidate_id})
                    DETACH DELETE c
                    """,
                    candidate_id=candidate_id,
                )
                logger.info(f"Deleted candidate {candidate_id} from Neo4j")
        except Exception as e:
            logger.error(f"Failed to delete candidate {candidate_id}: {e}")

    def delete_by_username(self, username: str):
        try:
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (c:User {username: $username})
                    DETACH DELETE c
                    """,
                    username=username,
                )
                logger.info(f"Deleted candidate {username} from Neo4j")
        except Exception as e:
            logger.error(f"Failed to delete candidate {username}: {e}")

    def delete_all(self):
        try:
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (c:User)
                    DETACH DELETE c
                    """
                )
                logger.info("Deleted all candidates from Neo4j")
        except Exception as e:
            logger.error(f"Failed to delete all candidates: {e}")

    # def get_candidates_by_job(
    #     self, job_id: str, min_fit_score: Optional[int] = None
    # ) -> List[Dict[str, Any]]:
    #     """
    #     Get all candidates for a specific job.

    #     Args:
    #         job_id: Job ID to filter by
    #         min_fit_score: Minimum fit score filter

    #     Returns:
    #         List of candidate objects
    #     """
    #     try:
    #         with self.driver.session() as session:
    #             if min_fit_score is not None:
    #                 result = session.run(
    #                     """
    #                     MATCH (c:Candidate)-[:APPLIED_TO]->(j:Job {jobId: $job_id})
    #                     WHERE c.fitScore >= $min_fit_score
    #                     RETURN c
    #                     ORDER BY c.fitScore DESC
    #                     """,
    #                     job_id=job_id,
    #                     min_fit_score=min_fit_score,
    #                 )
    #             else:
    #                 result = session.run(
    #                     """
    #                     MATCH (c:Candidate)-[:APPLIED_TO]->(j:Job {jobId: $job_id})
    #                     RETURN c
    #                     ORDER BY c.fitScore DESC
    #                     """,
    #                     job_id=job_id,
    #                 )

    #             results = []
    #             for record in result:
    #                 candidate = dict(record["c"])
    #                 # Convert Neo4j list types to Python lists
    #                 if "strengths" in candidate:
    #                     candidate["strengths"] = list(candidate["strengths"]) if candidate["strengths"] else []
    #                 if "concerns" in candidate:
    #                     candidate["concerns"] = list(candidate["concerns"]) if candidate["concerns"] else []
    #                 if "skills" in candidate:
    #                     candidate["skills"] = list(candidate["skills"]) if candidate["skills"] else []
    #                 results.append(candidate)

    #             logger.info(f"Retrieved {len(results)} candidates for job {job_id}")
    #             return results

    #     except Exception as e:
    #         logger.error(f"Failed to get candidates for job {job_id}: {e}")
    #         raise

    # def delete_candidates_by_job(self, job_id: str) -> int:
    #     """
    #     Delete all candidates associated with a job.

    #     Args:
    #         job_id: Job ID to delete candidates for

    #     Returns:
    #         Number of deleted candidates
    #     """
    #     try:
    #         with self.driver.session() as session:
    #             result = session.run(
    #                 """
    #                 MATCH (c:Candidate)-[r:APPLIED_TO]->(j:Job {jobId: $job_id})
    #                 DELETE r, c
    #                 RETURN count(c) as deleted_count
    #                 """,
    #                 job_id=job_id,
    #             )
    #             record = result.single()
    #             deleted_count = record["deleted_count"] if record else 0
    #             logger.info(f"Deleted {deleted_count} candidates for job {job_id}")
    #             return deleted_count

    #     except Exception as e:
    #         logger.error(f"Failed to delete candidates for job {job_id}: {e}")
    #         raise

    def close(self):
        """Close the Neo4j driver connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures connection is closed."""
        self.close()
        return False


# Singleton instance
_neo4j_service = None


def get_neo4j_service() -> Neo4jService:
    """Get or create the singleton Neo4jService instance."""
    global _neo4j_service
    if _neo4j_service is None:
        _neo4j_service = Neo4jService()
    return _neo4j_service
