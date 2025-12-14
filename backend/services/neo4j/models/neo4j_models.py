from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel, Field

class Neo4jNode(BaseModel):
    """Represents a Node in Neo4j."""
    element_id: str
    labels: Set[str]
    properties: Dict[str, Any]

class Neo4jRelationship(BaseModel):
    """Represents a Relationship in Neo4j."""
    element_id: str
    type: str
    start_node_id: str
    end_node_id: str
    properties: Dict[str, Any]

class CandidatePath(BaseModel):
    """Represents a Path from a User to other nodes (e.g. Skills)."""
    nodes: List[Neo4jNode]
    relationships: List[Neo4jRelationship]
    length: int

class CandidateGraph(BaseModel):
    """Collection of paths related to a candidate."""
    paths: List[CandidatePath] = Field(default_factory=list)

    def to_force_graph(self) -> "ForceGraphData":
        """
        Convert the nested paths into a flat structure for react-force-graph-2d.
        Deduplicates nodes and links.
        """
        unique_nodes: Dict[str, "GraphNode"] = {}
        unique_links: Dict[str, "GraphLink"] = {}

        for path in self.paths:
            # Process Nodes
            for node in path.nodes:
                if node.element_id not in unique_nodes:
                    # Determine a primary label (User, Skill, etc.)
                    label = list(node.labels)[0] if node.labels else "Unknown"
                    
                    # Create flat properties dict
                    node_data = {
                        "id": node.element_id,
                        "label": label,
                        **node.properties
                    }
                    unique_nodes[node.element_id] = GraphNode(**node_data)

            # Process Links
            for rel in path.relationships:
                if rel.element_id not in unique_links:
                    unique_links[rel.element_id] = GraphLink(
                        source=rel.start_node_id,
                        target=rel.end_node_id,
                        type=rel.type
                    )

        return ForceGraphData(
            nodes=list(unique_nodes.values()),
            links=list(unique_links.values())
        )


class GraphNode(BaseModel):
    """Node structure for react-force-graph."""
    id: str
    label: str
    # Allow extra fields for dynamic properties (username, name, etc.)
    model_config = {"extra": "allow"} 

class GraphLink(BaseModel):
    """Link structure for react-force-graph."""
    source: str
    target: str
    type: str

class ForceGraphData(BaseModel):
    """Complete graph data format for frontend."""
    nodes: List[GraphNode]
    links: List[GraphLink]


