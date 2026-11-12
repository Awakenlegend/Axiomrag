import { Activity, Check, ShieldCheck } from "lucide-react";

const stages = ["Ingest", "Hybrid search", "Rerank", "MCTS select", "Generate", "Verify"];

export function Pipeline() {
  return <div className="card pipeline"><div className="section-head"><div><h3>Reasoning pipeline</h3><span className="tiny muted">Illustrative pipeline overview</span></div><span className="status blue">OVERVIEW</span></div><div className="pipeline-line">{stages.map((stage, index) => <div className={`stage ${index < 4 ? "complete" : index === 4 ? "active" : ""}`} key={stage}><div className="stage-dot">{index < 4 ? <Check size={15} /> : index === 4 ? <Activity size={15} /> : <ShieldCheck size={15} />}</div><div className="stage-name">{stage}</div><div className="stage-state">{index < 4 ? "configured" : index === 4 ? "generation stage" : "verification stage"}</div></div>)}</div></div>;
}
