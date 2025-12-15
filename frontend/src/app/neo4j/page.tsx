import CandidateGraph from "@/features/neo4j/components/candidate-graph";

export default function Neo4jQueryPage() {
    const username = "alwyndsouza"
    return (
        <div className="relative" style={{ padding: '2rem' }}>
            {/* Subtle pixel grid background */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                />
            </div>

            <div className="relative z-10">
                <h1>Neo4j Graph Visualization</h1>

                <section style={{ marginBottom: '2rem' }}>
                    <h2>Candidate Graph: {username}</h2>
                    <CandidateGraph username={username} />
                </section>
            </div>
        </div>
    )
}
