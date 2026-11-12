const stages = [
  "Document ingestion",
  "BM25 + token-vector retrieval",
  "Heuristic reranking",
  "MCTS-style evidence selection",
  "LLM answer generation",
  "Heuristic claim checks",
];

export function Pipeline() {
  return (
    <div className="card pipeline">
      <div className="section-head">
        <div>
          <h3>Processing pipeline</h3>
          <span className="tiny muted">Current application workflow</span>
        </div>
        <span className="status blue">OVERVIEW</span>
      </div>
      <div className="pipeline-line">
        {stages.map((stage, index) => (
          <div className="stage" key={stage}>
            <div className="stage-dot"><span>{index + 1}</span></div>
            <div className="stage-name">{stage}</div>
            <div className="stage-state">Stage {index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
