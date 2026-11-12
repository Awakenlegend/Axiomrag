import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Gauge, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import { Shell } from "../components/AppShell";
import { Stat } from "../components/MetricCard";

type EvaluationSummary = {
  runs: number;
  reliability: number;
  hallucinationRate: number;
  abstentionRate: number;
  correctionRate: number;
};

type QueryRun = {
  id: string;
  createdAt: string;
  reliability: number;
};

type Policy = {
  minReliability: number;
  abstainBelow: number;
  maxEvidenceChunks: number;
};

export default function EvaluationPage() {
  const [summary, setSummary] = useState<EvaluationSummary>({
    runs: 0,
    reliability: 0,
    hallucinationRate: 0,
    abstentionRate: 0,
    correctionRate: 0,
  });
  const [runs, setRuns] = useState<QueryRun[]>([]);
  const [policy, setPolicy] = useState<Policy>({
    minReliability: 0.68,
    abstainBelow: 0.62,
    maxEvidenceChunks: 3,
  });

  useEffect(() => {
    fetch("/api/rag/evaluation").then(response => {
      if (!response.ok) throw new Error("Unable to load evaluation summary.");
      return response.json();
    }).then(setSummary).catch(() => undefined);

    fetch("/api/rag/runs").then(response => {
      if (!response.ok) throw new Error("Unable to load saved query runs.");
      return response.json();
    }).then(data => setRuns(data.runs ?? [])).catch(() => undefined);

    fetch("/api/rag/settings").then(response => {
      if (!response.ok) throw new Error("Unable to load policy settings.");
      return response.json();
    }).then(setPolicy).catch(() => undefined);
  }, []);

  const chartValues = runs.slice(0, 8).reverse().map(run => Math.round(run.reliability * 100));

  return (
    <Shell>
      <div className="page-section">
        <div className="page-title">
          <div className="eyebrow">Workspace / Evaluation</div>
          <h1>Measure what matters.</h1>
          <p>Review application-level query estimates, abstention decisions, and correction activity.</p>
        </div>

        <div className="grid stats-grid">
          <Stat label="Average reliability estimate" value={summary.runs ? `${Math.round(summary.reliability * 100)}%` : "—"} change="Heuristic score from saved runs" icon={CheckCircle2} />
          <Stat label="Correction rate" value={summary.runs ? `${Math.round(summary.correctionRate * 100)}%` : "—"} change="Runs with at least one correction pass" icon={RotateCcw} />
          <Stat label="Abstention rate" value={summary.runs ? `${Math.round(summary.abstentionRate * 100)}%` : "—"} change="Decisions made by the current policy" icon={Gauge} />
          <Stat label="Unsupported-claim estimate" value={summary.runs ? `${Math.round(summary.hallucinationRate * 100)}%` : "—"} change="Based on heuristic claim checks" icon={ShieldCheck} />
        </div>

        <p className="muted tiny" style={{ margin: "12px 0 18px", lineHeight: 1.7 }}>
          These values summarize the current application's heuristic checks. They are not calibrated probabilities, scientific benchmark results, or a substitute for a labelled evaluation against a baseline.
        </p>

        <div className="grid content-grid">
          <div className="card">
            <div className="card-pad section-head">
              <div>
                <h3>Saved reliability estimates</h3>
                <span className="tiny muted">{summary.runs ? `${summary.runs} recent saved query runs` : "Run queries to populate history"}</span>
              </div>
              <span className="tiny muted">Reliability estimate (%)</span>
            </div>
            {chartValues.length ? (
              <>
                <div className="chart">{chartValues.map((height, index) => <div key={index} className="bar" style={{ height: `${height}%` }} />)}</div>
                <div className="chart-labels">
                  {runs.slice(0, 8).reverse().map(run => <span key={run.id}>{new Date(run.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}
                </div>
              </>
            ) : (
              <div className="empty-state">No saved runs yet. Ask a question in the workspace to start recording application metrics.</div>
            )}
          </div>

          <div className="card evidence-card">
            <div className="section-head">
              <div><h3>Active answer policy</h3><span className="tiny muted">Applied to new query runs</span></div>
              <Settings size={17} color="#75b7ff" />
            </div>
            <div className="evidence-item"><div className="evidence-label"><span className="muted">Minimum reliability</span><span className="mono">{policy.minReliability.toFixed(2)}</span></div></div>
            <div className="evidence-item"><div className="evidence-label"><span className="muted">Abstain below</span><span className="mono">{policy.abstainBelow.toFixed(2)}</span></div></div>
            <div className="evidence-item"><div className="evidence-label"><span className="muted">Maximum evidence chunks</span><span className="mono">{policy.maxEvidenceChunks}</span></div></div>
            <Link href="/settings" className="btn btn-secondary" style={{ marginTop: 15 }}>Tune policy <ArrowRight size={14} /></Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
