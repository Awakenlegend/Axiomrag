import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Database, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Shell } from "../components/AppShell";
import { Stat } from "../components/MetricCard";
import { Pipeline } from "../components/PipelineOverview";

type Summary = {
  runs: number;
  reliability: number;
  hallucinationRate: number;
  abstentionRate: number;
  correctionRate: number;
};

type QueryRun = {
  id: string;
  question: string;
  createdAt: string;
  reliability: number;
  abstained: boolean;
  corrections: number;
};

const emptySummary: Summary = {
  runs: 0,
  reliability: 0,
  hallucinationRate: 0,
  abstentionRate: 0,
  correctionRate: 0,
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [runs, setRuns] = useState<QueryRun[]>([]);
  const [status, setStatus] = useState("Loading workspace data…");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [summaryResponse, documentsResponse, runsResponse] = await Promise.all([
          fetch("/api/rag/evaluation"),
          fetch("/api/rag/documents"),
          fetch("/api/rag/runs"),
        ]);

        if (!summaryResponse.ok || !documentsResponse.ok || !runsResponse.ok) {
          throw new Error("The dashboard API returned an error.");
        }

        const [summaryData, documentsData, runsData] = await Promise.all([
          summaryResponse.json(),
          documentsResponse.json(),
          runsResponse.json(),
        ]);

        if (cancelled) return;
        setSummary(summaryData);
        setDocumentCount(Array.isArray(documentsData.documents) ? documentsData.documents.length : 0);
        setRuns(Array.isArray(runsData.runs) ? runsData.runs : []);
        setStatus("Showing data from the connected application database.");
      } catch {
        if (!cancelled) setStatus("Dashboard data is unavailable. Check the server and database connection.");
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  return (
    <Shell>
      <div className="page-section">
        <div className="topbar" style={{ marginBottom: 23 }}>
          <div>
            <div className="eyebrow">AxiomRAG / Workspace overview</div>
            <h1 style={{ marginTop: 8 }}>Your evidence workspace.</h1>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>{status}</p>
          </div>
          <Link className="btn btn-primary" href="/workspace">Open research workspace <ArrowRight size={15} /></Link>
        </div>

        <div className="card hero">
          <div className="hero-content">
            <div className="eyebrow" style={{ color: "#80b9ff" }}>Document-grounded RAG prototype</div>
            <h2 style={{ fontSize: 30, marginTop: 12 }}>Answers that know when<br />the evidence is not enough.</h2>
            <p>AxiomRAG retrieves passages from your documents, generates evidence-grounded responses, and applies claim checks and an abstention policy before returning an answer.</p>
            <Link className="btn btn-secondary" href="/workspace">Open research workspace <ArrowRight size={15} /></Link>
          </div>
        </div>

        <div className="grid stats-grid">
          <Stat label="Average reliability estimate" value={summary.runs ? `${Math.round(summary.reliability * 100)}%` : "—"} change={summary.runs ? `Across ${summary.runs} saved runs · heuristic` : "No saved query runs yet"} icon={Gauge} />
          <Stat label="Documents indexed" value={documentCount === null ? "—" : String(documentCount)} change="PDF and TXT documents in the corpus" icon={Database} />
          <Stat label="Saved query runs" value={String(summary.runs)} change="Recent runs stored by the application" icon={FileCheck2} />
          <Stat label="Abstention rate" value={summary.runs ? `${Math.round(summary.abstentionRate * 100)}%` : "—"} change="Based on the current answer policy" icon={ShieldCheck} />
        </div>

        <div className="grid content-grid">
          <div className="grid" style={{ gap: 16 }}>
            <Pipeline />
            <div className="card table-card">
              <div className="card-pad section-head">
                <div>
                  <h3>Recent query runs</h3>
                  <span className="tiny muted">Saved requests and application policy outcomes</span>
                </div>
                <Link href="/verification" className="btn btn-ghost">Verification <ArrowRight size={14} /></Link>
              </div>
              {runs.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Question</th><th>Date</th><th>Policy score</th><th>Decision</th></tr></thead>
                    <tbody>
                      {runs.slice(0, 6).map(run => (
                        <tr key={run.id}>
                          <td>{run.question}</td>
                          <td className="mono tiny">{new Date(run.createdAt).toLocaleDateString()}</td>
                          <td className="mono tiny">{Math.round(run.reliability * 100)}%</td>
                          <td><span className={`status ${run.abstained ? "amber" : "green"}`}>{run.abstained ? "Abstained" : "Answer returned"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">No saved query runs yet. Upload a document and ask a question to begin.</div>
              )}
            </div>
          </div>

          <div className="card evidence-card">
            <div className="section-head">
              <div><h3>Implementation snapshot</h3><span className="tiny muted">Current repository pipeline</span></div>
              <Database size={17} color="#6f9cff" />
            </div>
            {[
              ["Retrieval", "BM25 + token-vector cosine"],
              ["Reranking", "Heuristic relevance score"],
              ["Evidence selection", "Custom MCTS-style search"],
              ["Answer generation", "Configured Manus LLM + fallback"],
              ["Claim checks", "Lexical and vector similarity"],
            ].map(([label, value]) => (
              <div className="evidence-item" key={label}>
                <div className="evidence-label"><span className="muted">{label}</span><span className="mono tiny">{value}</span></div>
              </div>
            ))}
            <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.7 }}>
              Claim checks and reliability values are heuristic. A trained NLI model and neural cross-encoder are not integrated in the current implementation.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
