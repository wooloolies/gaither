import CandidateGraph from "@/features/neo4j/components/candidate-graph";

export default function Neo4jQueryPage() {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Neo4j Graph Visualization</h1>

            <section style={{ marginBottom: '2rem' }}>
                <h2>Candidate Graph: dev_alice1</h2>
                <CandidateGraph username="dev_alice1" />
            </section>
        </div>
    )
}
