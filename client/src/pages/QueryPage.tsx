import { useState } from "react";
import { Check, CheckCircle2, CircleHelp, FileText, Search, Sparkles, Zap } from "lucide-react";
import { Shell } from "../components/AppShell";

export default function QueryPage() {
  const [question, setQuestion] = useState("How does Monte Carlo Tree Search improve evidence selection in RAG systems?");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ask = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to query the corpus.");
      setResult(payload);
      localStorage.setItem("axiomrag:last-result", JSON.stringify(payload));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to query the corpus."); }
    finally { setLoading(false); }
  };
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Workspace / RAG Query</div><h1>Ask the corpus.</h1><p>Every answer includes its reasoning path, supporting evidence, and a reliability decision.</p></div><div className="card query-box"><textarea value={question} onChange={e => setQuestion(e.target.value)} /><div className="query-actions"><span className="tiny muted"><Sparkles size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />BM25 + vector retrieval · reranking · MCTS selection · claim verification</span><button className="btn btn-primary" disabled={loading} onClick={ask}><Zap size={15} /> {loading ? "Retrieving evidence…" : "Run self-correcting RAG"}</button></div></div>{error && <div className="claim warn" style={{ marginTop: 16 }}><CircleHelp size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} />{error}</div>}{result && <div className="card answer-block"><div className="section-head"><div><span className="eyebrow" style={{ color: result.abstained ? "#f3c16e" : "#79b9ff" }}>{result.abstained ? "Abstention decision" : "Answer assessment"}</span><h2 style={{ marginTop: 8, fontSize: 21 }}>{result.abstained ? "The corpus cannot support this answer yet." : "Answer generated from retrieved evidence."}</h2></div><span className={`status ${result.abstained ? "amber" : "green"}`}>{Math.round(result.reliability * 100)}% RELIABLE</span></div><p>{result.answer}</p>{result.claims.map((claim: any) => <div className={`claim ${claim.status !== "Supported" ? "warn" : ""}`} key={claim.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 15 }}><strong>{claim.status === "Supported" ? <CheckCircle2 size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} /> : <CircleHelp size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} />}{claim.id} · {claim.status}</strong><span className="mono tiny">support {Math.round(claim.support * 100)}%</span></div><div style={{ marginTop: 5 }}>{claim.text}</div><span className="muted tiny">{claim.reason}</span></div>)}{result.trace?.stages && <div style={{ marginTop: 18 }}><span className="eyebrow">Processing trace</span><div className="pipeline-line" style={{ marginTop: 14 }}>{result.trace.stages.map((stage: any) => <div className="stage complete" key={stage.name}><div className="stage-dot"><Check size={15} /></div><div className="stage-name">{stage.name}</div><div className="stage-state">{stage.detail}</div></div>)}</div><div className="tiny muted" style={{ marginTop: 12 }}>MCTS simulations: {result.trace.mctsSimulations} · correction passes: {result.corrections} · trace time: {result.trace.durationMs}ms</div></div>}<div style={{ marginTop: 16 }}><span className="eyebrow">Retrieved evidence</span>{result.evidence.map((item: any) => <div className="evidence-item" key={item.id}><div className="evidence-label"><span><FileText size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#75b7ff" }} />{item.document}</span><span className="mono">rerank {Math.round(item.rerank * 100)}%</span></div><div className="muted tiny">BM25 {item.bm25} · vector {item.vector} · {item.text.slice(0, 220)}…</div></div>)}</div></div>}</div></Shell>;
}

