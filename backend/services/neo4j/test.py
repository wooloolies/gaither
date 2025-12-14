import os
import sys
from unittest.mock import MagicMock
from dotenv import load_dotenv

# Add project root to sys.path to resolve backend imports
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, "backend"))

# MOCK DEPENDENCIES BEFORE IMPORTING SERVICE
# This prevents ImportErrors from modules we don't need for this specific test
sys.modules["anthropic"] = MagicMock()
sys.modules["config"] = MagicMock()
sys.modules["backend.services.llm"] = MagicMock()
sys.modules["apify_client"] = MagicMock()
sys.modules["google"] = MagicMock()
sys.modules["google.generativeai"] = MagicMock()
sys.modules["fastapi"] = MagicMock()
sys.modules["websockets"] = MagicMock()

from backend.services.neo4j.service import Neo4jService

def main():
    # Load environment variables from .env file in project root
    load_dotenv(os.path.join(project_root, ".env"))
    
    service = None
    try:
        print("Initializing Neo4jService...")
        service = Neo4jService()
        
        username = "dev_boa1"  # Default or change as needed
        if len(sys.argv) > 1:
            username = sys.argv[1]
            
        # Define test data
        candidates_data = [
            {
                "username": "dev_alice1",
                "location": "San Francisco, CA",
                "top_repo": ["facebook/react", "google/guava"],
                "skills": ["Python", "Java", "Docker"],
                "education": ["MIT"],
                "id": "id_alice"
            },
            {
                "username": "dev_bob1",
                "location": None,
                "top_repo": ["facebook/react"], # Shared repo with Alice
                "skills": ["Python", "Go"],     # Shared skill with Alice
                "education": ["Stanford", ""],
                "id": "id_bob"
            },
            {
                "username": "dev_boa1",
                "location": "New York, NY",
                "top_repo": ["facebook/react"], # Shared repo with Alice
                "skills": ["Python", "Go"],     # Shared skill with Alice
                "education": [],
                "id": "test_id_123"
            },
            {
                "username": "dev_charlie1",
                "location": "New York, NY", # Shared location with Boa
                "top_repo": ["google/guava", "microsoft/vscode"], # Shared repo with Alice
                "skills": ["TypeScript", "React", "Docker"], # Shared skill with Alice
                "education": ["MIT"], # Shared education with Alice
                "id": "id_charlie"
            },
            {
                "username": "dev_dave1",
                "location": "London, UK",
                "top_repo": [],
                "skills": ["Rust", "C++"],
                "education": ["Cambridge"],
                "id": "id_dave"
            },
            {
                "username": "dev_me",
                "location": "",
                "top_repo": ["facebook/react"],
                "skills": [],
                "education": [],
                "id": "id_me"
            },
            {
                "username": "dev_empty",
                "location": None,
                "top_repo": [],
                "skills": [],
                "education": [],
                "id": "id_empty"
            }
        ]

        print(f"Storing {len(candidates_data)} candidates...")
        
        for data in candidates_data:
            print(f"Processing {data['username']}...")
            service.store_candidate(
                candidate_id=data["id"],
                job_id="test_job_batch",
                username=data["username"],
                profile_url=f"https://github.com/{data['username']}",
                strengths=[],
                concerns=[],
                skills=data["skills"],
                fit_score=0,
                location=data["location"],
                bio="Test bio",
                top_repo=data["top_repo"],
                education=data["education"]
            )
            # Cannot pass top_repo and education directly to store_candidate in current signature
            # store_candidate only takes specific args. 
            # Wait, verify store_candidate signature in service.py.
            # It takes: candidate_id, job_id, username, profile_url, strengths, concerns, skills, fit_score, location, bio.
            # It DOES NOT take top_repo or education in the method signature currently, 
            # BUT the implementation creates Neo4jCandidate which HAS those fields.
            # I need to update store_candidate signature or method to accept them!
            
        print("All candidates stored.")
            
        # Verify one
        check_user = "dev_alice1"
        print(f"\nSearching for candidate with username: {check_user}")
        graph = service.get_candidate_by_username(check_user)
        
        if graph and graph.paths:
            print(f"\nFound {len(graph.paths)} paths for candidate.")
            for i, path in enumerate(graph.paths):
                print(f"\nPath {i+1} (length {path.length}):")
                print("Nodes:")
                for node in path.nodes:
                    print(f"  - {node.labels}: {node.properties}")
                print("Relationships:")
                for rel in path.relationships:
                    print(f"  - {rel.type} (from {rel.start_node_id} to {rel.end_node_id}): {rel.properties}")
        else:
            print(f"\nNo candidate found or no paths returned for username: {check_user}")

        # Verify get_candidate_by_id
        check_id = "id_alice"
        print(f"\nSearching for candidate with id: {check_id}")
        graph = service.get_candidate_by_id(check_id)
        
        if graph and graph.paths:
            print(f"\nFound {len(graph.paths)} paths for candidate.")
            for i, path in enumerate(graph.paths):
                print(f"\nPath {i+1} (length {path.length}):")
                print("Nodes:")
                for node in path.nodes:
                    print(f"  - {node.labels}: {node.properties}")
                print("Relationships:")
                for rel in path.relationships:
                    print(f"  - {rel.type} (from {rel.start_node_id} to {rel.end_node_id}): {rel.properties}")
        else:
            print(f"\nNo candidate found or no paths returned for id: {check_id}")

        # Verify get_all_candidates
        print(f"\nGetting all candidates graph snapshot...")
        graph = service.get_all_candidates()
        
        if graph and graph.paths:
            print(f"\nFound {len(graph.paths)} paths in full graph snapshot.")
            
            # Count unique nodes and relationships
            unique_nodes = set()
            unique_rels = set()
            node_labels = set()
            rel_types = set()
            
            for path in graph.paths:
                for node in path.nodes:
                    unique_nodes.add(node.element_id)
                    node_labels.update(node.labels)
                for rel in path.relationships:
                    unique_rels.add(rel.element_id)
                    rel_types.add(rel.type)
            
            print(f"Graph snapshot contains nodes of types: {node_labels}")
            print(f"Graph snapshot contains relationships of types: {rel_types}")
            print(f"Total unique nodes: {len(unique_nodes)}")
            print(f"Total unique relationships: {len(unique_rels)}")
        else:
            print("\nNo paths found in get_all_candidates.")
            
        # # Verify delete_by_id
        # delete_id = "id_alice"
        # print(f"\nDeleting candidate with id: {delete_id}")
        # service.delete_by_id(delete_id)
        
        # # Verify deletion
        # print(f"Verifying deletion of id: {delete_id}")
        # check_graph = service.get_candidate_by_id(delete_id)
        # if not check_graph or not check_graph.paths:
        #     print(f"Successfully deleted candidate {delete_id}")
        # else:
        #     print(f"Failed to delete candidate {delete_id}, still found paths.")

        # # Verify delete_by_username
        # delete_user = "dev_bob1"
        # print(f"\nDeleting candidate with username: {delete_user}")
        # service.delete_by_username(delete_user)
        
        # # Verify deletion
        # print(f"Verifying deletion of username: {delete_user}")
        # check_graph = service.get_candidate_by_username(delete_user)
        # if not check_graph or not check_graph.paths:
        #     print(f"Successfully deleted candidate {delete_user}")
        # else:
        #     print(f"Failed to delete candidate {delete_user}, still found paths.")
            
        # Final count check
        print("\nFinal graph snapshot after deletions:")
        final_graph = service.get_all_candidates()
        if final_graph and final_graph.paths:
            unique_nodes = set()
            for path in final_graph.paths:
                for node in path.nodes:
                    unique_nodes.add(node.element_id)
            print(f"Total unique nodes remaining: {len(unique_nodes)}")
            
        # Verify get_graph_by_filter
        print(f"\n--- Testing get_graph_by_filter ---")
        
        # Test 1: Filter by Skill
        skill_name = "Python"
        print(f"\nFiltering by Skill: {skill_name}")
        skill_graph = service.get_graph_by_filter("skill", skill_name)
        if skill_graph and skill_graph.paths:
            print(f"Found {len(skill_graph.paths)} connections to {skill_name}")
            users_with_skill = set()
            for path in skill_graph.paths:
                 for node in path.nodes:
                     if "User" in node.labels:
                         users_with_skill.add(node.properties.get("username", "Unknown"))
            print(f"Users with {skill_name}: {users_with_skill}")
        else:
            print(f"No connections found for Skill: {skill_name}")

        # Test 2: Filter by Location
        loc_name = "San Francisco, CA"
        print(f"\nFiltering by Location: {loc_name}")
        loc_graph = service.get_graph_by_filter("location", loc_name)
        if loc_graph and loc_graph.paths:
             print(f"Found {len(loc_graph.paths)} connections to {loc_name}")
        else:
             print(f"No connections found for Location: {loc_name}")
             
        # Test 3: Filter by Repo
        repo_name = "facebook/react"
        print(f"\nFiltering by Repo: {repo_name}")
        repo_graph = service.get_graph_by_filter("repo", repo_name)
        if repo_graph and repo_graph.paths:
             print(f"Found {len(repo_graph.paths)} connections to {repo_name}")
        else:
             print(f"No connections found for Repo: {repo_name}")

        # Test 4: Filter by Education (should be empty as we deleted Alice/Charlie in previous runs if persistent, but here we run clean)
        # Note: In this script we delete at the end, so if we run this BEFORE delete, we see results.
        # But I'm appending this to the END of the script, where deletions happen just above.
        # To test properly, I should run these BEFORE deletion or insert data again.
        # Since the script inserts data at the start every time (assuming clean DB or merge), 
        # but wait, the deletions happen at lines 200+.
        # I should insert this block BEFORE the deletion block to see results!
        
        # However, for now I will place it BEFORE deletions by replacing indentation and position if I could, 
        # but I am forced to append or replace specific lines.
        # I will simpler move the deletion to the very end and put this check before it.
        # Actually, let's just re-insert Alice for the test or just test with what remains.
        # Remaining users: Charlie, Dave, Me, Empty, Boa.
        # Charlie has "MIT". Boa has location "New York".
        
        edu_name = "MIT"
        print(f"\nFiltering by Education: {edu_name}")
        edu_graph = service.get_graph_by_filter("education", edu_name)
        if edu_graph and edu_graph.paths:
             print(f"Found {len(edu_graph.paths)} connections to {edu_name}")
             users_with_edu = set()
             for path in edu_graph.paths:
                 for node in path.nodes:
                     if "User" in node.labels:
                         users_with_edu.add(node.properties.get("username", "Unknown"))
             print(f"Users with {edu_name}: {users_with_edu}")
        else:
             print(f"No connections found for Education: {edu_name}")

        # Verify to_force_graph (Frontend Transformation)
        print(f"\n--- Testing to_force_graph Transformation ---")
        if skill_graph and skill_graph.paths:
            force_data = skill_graph.to_force_graph()
            print(f"Transformed Graph Data:")
            print(f" - Nodes: {len(force_data.nodes)}")
            print(f" - Links: {len(force_data.links)}")
            
            # Check structure of a sample node
            if force_data.nodes:
                print(f"Sample Node: {force_data.nodes[0]}")
            
            # Check structure of a sample link
            if force_data.links:
                print(f"Sample Link: {force_data.links[0]}")
                
            # Verification: Nodes should be unique
            node_ids = [n.id for n in force_data.nodes]
            if len(node_ids) == len(set(node_ids)):
                print("SUCCESS: All nodes are unique.")
            else:
                print(f"FAILURE: Duplicate nodes found! Total: {len(node_ids)}, Unique: {len(set(node_ids))}")
        else:
             print("Skipping transformation test (no skill graph found).")


            
    except Exception as e:
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if service:
            service.close()

if __name__ == "__main__":
    main()