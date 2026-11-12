import { useEffect, useRef, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Database,
  FileCheck2,
  FileText,
  Gauge,
  GitBranch,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { startLogin } from "./const";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [

  { href: "/workspace", label: "Ask Documents", icon: Network },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Documents", icon: FileText },
  { href: "/query", label: "RAG Query", icon: Search },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="logo-mark landing-logo-mark"><svg viewBox="0 0 23 17" aria-hidden="true"><path d="M8.15 .9H4.55L.5 9.3h3.6zM17 0h-3.6L6.15 16.4h3.6zM22.9 0h-3.6L15 7.6h3.6zM22.6 6.9H19l-4.95 9.5h3.6z" /></svg></div>
      {!compact && <div><div className="brand-name">AxiomRAG</div><span className="brand-sub">self-correcting intelligence</span></div>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  return (
    <div className="dashboard-shell console-shell">
      <video className="shell-art" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" />
      <div className="shell-veil" />
      <aside className="sidebar">
        <Link href="/"><Logo /></Link>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={label} aria-label={label} className={`nav-item ${location === href ? "active" : ""}`}><Icon size={17} /><span>{label}</span></Link>
          ))}
        </nav>
        <div className="nav-label" style={{ marginTop: 30 }}>System</div>
        <nav className="nav-list">
          <Link href="/settings" className={`nav-item ${location === "/settings" ? "active" : ""}`}><Settings size={17} /><span>Settings</span></Link>
          <Link href="/about" className={`nav-item ${location === "/about" ? "active" : ""}`}><Info size={17} /><span>About</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}><span className="tiny muted">SYSTEM STATUS</span><span className="status green">ONLINE</span></div>
          <div className="tiny muted">Corpus synchronized</div>
          <div style={{ height: 4, background: "#18334e", borderRadius: 4, marginTop: 9 }}><div style={{ width: "88%", height: "100%", background: "#5dd6a0", borderRadius: 4 }} /></div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="eyebrow">AxiomRAG / Research workspace</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="icon-btn" aria-label="notifications" onClick={() => notify("No new notifications") }><Bell size={17} /></button>
            <button className="icon-btn" aria-label="theme" onClick={() => notify("Dark research theme is active") }><Moon size={16} /></button>
            <Link className="shell-home-pill" href="/">AxiomRAG home <ArrowRight size={13} /></Link>
          </div>
        </header>
        {children}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: LucideIcon }) {
  return <div className="card stat-card"><div className="stat-top"><span>{label}</span><Icon size={16} color="#75b7ff" /></div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>;
}

const stages = ["Ingest", "Hybrid search", "Rerank", "MCTS select", "Generate", "Verify"];
function Pipeline() {
  return <div className="card pipeline"><div className="section-head"><div><h3>Reasoning pipeline</h3><span className="tiny muted">Live trace · query_8F31</span></div><span className="status blue">RUNNING</span></div><div className="pipeline-line">{stages.map((stage, index) => <div className={`stage ${index < 4 ? "complete" : index === 4 ? "active" : ""}`} key={stage}><div className="stage-dot">{index < 4 ? <Check size={15} /> : index === 4 ? <Activity size={15} /> : <ShieldCheck size={15} />}</div><div className="stage-name">{stage}</div><div className="stage-state">{index < 4 ? "complete" : index === 4 ? "processing" : "queued"}</div></div>)}</div></div>;
}

function Dashboard() {
  const [running, setRunning] = useState(false);
  return <Shell><div className="page-section">
    <div className="topbar" style={{ marginBottom: 23 }}><div><div className="eyebrow">Thursday, November 05, 2026</div><h1 style={{ marginTop: 8 }}>Your evidence workspace.</h1><p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>Ready for another rigorous answer.</p></div><button className="btn btn-primary" onClick={() => setRunning(!running)}>{running ? <RotateCcw size={15} /> : <Play size={15} />}{running ? "Running evaluation" : "Run evaluation"}</button></div>
    <div className="card hero"><div className="hero-content"><div className="eyebrow" style={{ color: "#80b9ff" }}>Adaptive Self-Correction / v0.9.4</div><h2 style={{ fontSize: 30, marginTop: 12 }}>Answers that know when<br />the evidence is not enough.</h2><p>AxiomRAG combines retrieval, reasoning, and claim-level verification into one transparent loop. Every response is scored, traced, and corrected before it reaches you.</p><Link className="btn btn-secondary" href="/workspace">Open research workspace <ArrowRight size={15} /></Link></div></div>
    <div className="grid stats-grid"><Stat label="Reliability score" value="94.8%" change="↑ 3.2% this week" icon={Gauge} /><Stat label="Documents indexed" value="128" change="↑ 12 this month" icon={Database} /><Stat label="Claims verified" value="2,641" change="↑ 18.6% this week" icon={FileCheck2} /><Stat label="Abstention rate" value="6.4%" change="↓ 1.1% this week" icon={ShieldCheck} /></div>
    <div className="grid content-grid"><div className="grid" style={{ gap: 16 }}><Pipeline /><div className="card table-card"><div className="card-pad section-head"><div><h3>Recent query traces</h3><span className="tiny muted">Your latest reasoning runs</span></div><Link href="/verification" className="btn btn-ghost">View all <ChevronRight size={14} /></Link></div><div className="table-wrap"><table><thead><tr><th>Query</th><th>Evidence</th><th>Reliability</th><th>Status</th></tr></thead><tbody>{[["How does MCTS improve evidence selection?","12 chunks","96.2%","Verified"],["Compare hybrid retrieval strategies","8 chunks","91.7%","Verified"],["When should a RAG system abstain?","4 chunks","88.1%","Review"]].map(row => <tr key={row[0]}><td>{row[0]}</td><td className="mono tiny">{row[1]}</td><td className="mono tiny" style={{ color: "#74dcae" }}>{row[2]}</td><td><span className={`status ${row[3] === "Review" ? "amber" : "green"}`}>{row[3]}</span></td></tr>)}</tbody></table></div></div></div><div className="card evidence-card"><div className="section-head"><div><h3>Evidence health</h3><span className="tiny muted">Corpus quality overview</span></div><Activity size={17} color="#6f9cff" /></div>{[["Source coverage","92%"],["Citation precision","97%"],["Contradiction rate","4%"],["Freshness index","86%"]].map(([label,value], index) => <div className="evidence-item" key={label}><div className="evidence-label"><span className="muted">{label}</span><span className="mono" style={{ color: index === 2 ? "#f3c16e" : "#b4d2f5" }}>{value}</span></div><div className="evidence-bar"><div className="evidence-fill" style={{ width: value }} /></div></div>)}<div style={{ marginTop: 18, padding: 13, borderRadius: 9, background: "rgba(95,215,166,.06)", color: "#78dbaf", fontSize: 11, lineHeight: 1.6 }}><CheckCircle2 size={14} style={{ verticalAlign: "-3px", marginRight: 5 }} /> Your corpus is healthy enough for high-confidence answers.</div></div></div>
  </div></Shell>;
}

function Upload() {
  const [files, setFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("Ready for PDF or TXT files.");
  const [documents, setDocuments] = useState<{ name: string; chunks: number }[]>([]);
  const toBase64 = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  };
  const handleFiles = async (fileList: FileList | null) => {
    const selected = Array.from(fileList ?? []);
    if (!selected.length) return;
    setFiles(selected.map(file => file.name));
    setStatus(`Processing ${selected.length} document${selected.length > 1 ? "s" : ""}…`);
    try {
      const uploaded: { name: string; chunks: number }[] = [];
      for (const file of selected) {
        const data = await toBase64(file);
        const response = await fetch("/api/rag/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, data }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Upload failed");
        uploaded.push({ name: result.document.name, chunks: result.document.chunks });
      }
      setDocuments(previous => [...previous, ...uploaded]);
      setStatus(`Indexed ${uploaded.length} document${uploaded.length > 1 ? "s" : ""}. Ready for questions.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed. Please retry."); }
  };
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Workspace / Documents</div><h1>Build your evidence corpus.</h1><p>Upload source material and AxiomRAG will extract, chunk, embed, and index it for transparent retrieval.</p></div><div className="card form-card"><div className="section-head"><div><h3>Document ingestion</h3><span className="tiny muted">{status}</span></div><UploadCloud size={20} color="#75b7ff" /></div><label className="dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); handleFiles(event.dataTransfer.files); }}><UploadCloud size={28} /><strong>Drop files here or browse your workspace</strong><span>Supported: PDF, TXT · Max 50 MB each</span><input ref={inputRef} className="file-input" aria-label="Choose PDF or TXT documents" type="file" accept=".pdf,.txt" multiple onChange={e => handleFiles(e.target.files)} /></label>{files.length > 0 && <div style={{ marginBottom: 18 }}>{files.map(file => <div key={file} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "#0c2038", marginTop: 7, fontSize: 12 }}><span><FileText size={14} style={{ verticalAlign: "-3px", marginRight: 8, color: "#76b8ff" }} />{file}</span><CheckCircle2 size={15} color="#63dba6" /></div>)}</div>}<button className="btn btn-primary" onClick={() => inputRef.current?.click()}><Plus size={15} /> {files.length ? "Add documents" : "Select documents"}</button>{documents.length > 0 && <div style={{ marginTop: 18, color: "#79dbaf", fontSize: 12 }}><CheckCircle2 size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} />{documents.length} document{documents.length > 1 ? "s" : ""} indexed · {documents.reduce((sum, doc) => sum + doc.chunks, 0)} searchable chunks</div>}</div></div></Shell>;
}

function Query() {
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
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Workspace / RAG Query</div><h1>Ask the corpus.</h1><p>Every answer includes its reasoning path, supporting evidence, and a reliability decision.</p></div><div className="card query-box"><textarea value={question} onChange={e => setQuestion(e.target.value)} /><div className="query-actions"><span className="tiny muted"><Sparkles size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />BM25 + vector retrieval · reranking · MCTS selection · claim verification</span><button className="btn btn-primary" disabled={loading} onClick={ask}><Zap size={15} /> {loading ? "Retrieving evidence…" : "Run self-correcting RAG"}</button></div></div>{error && <div className="claim warn" style={{ marginTop: 16 }}><CircleHelp size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} />{error}</div>}{result && <div className="card answer-block"><div className="section-head"><div><span className="eyebrow" style={{ color: result.abstained ? "#f3c16e" : "#79b9ff" }}>{result.abstained ? "Abstention decision" : "Verified answer"}</span><h2 style={{ marginTop: 8, fontSize: 21 }}>{result.abstained ? "The corpus cannot support this answer yet." : "Answer generated from retrieved evidence."}</h2></div><span className={`status ${result.abstained ? "amber" : "green"}`}>{Math.round(result.reliability * 100)}% RELIABLE</span></div><p>{result.answer}</p>{result.claims.map((claim: any) => <div className={`claim ${claim.status !== "Supported" ? "warn" : ""}`} key={claim.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 15 }}><strong>{claim.status === "Supported" ? <CheckCircle2 size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} /> : <CircleHelp size={14} style={{ verticalAlign: "-3px", marginRight: 6 }} />}{claim.id} · {claim.status}</strong><span className="mono tiny">support {Math.round(claim.support * 100)}%</span></div><div style={{ marginTop: 5 }}>{claim.text}</div><span className="muted tiny">{claim.reason}</span></div>)}{result.trace?.stages && <div style={{ marginTop: 18 }}><span className="eyebrow">Live reasoning trace</span><div className="pipeline-line" style={{ marginTop: 14 }}>{result.trace.stages.map((stage: any) => <div className="stage complete" key={stage.name}><div className="stage-dot"><Check size={15} /></div><div className="stage-name">{stage.name}</div><div className="stage-state">{stage.detail}</div></div>)}</div><div className="tiny muted" style={{ marginTop: 12 }}>MCTS simulations: {result.trace.mctsSimulations} · correction passes: {result.corrections} · trace time: {result.trace.durationMs}ms</div></div>}<div style={{ marginTop: 16 }}><span className="eyebrow">Retrieved evidence</span>{result.evidence.map((item: any) => <div className="evidence-item" key={item.id}><div className="evidence-label"><span><FileText size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#75b7ff" }} />{item.document}</span><span className="mono">rerank {Math.round(item.rerank * 100)}%</span></div><div className="muted tiny">BM25 {item.bm25} · vector {item.vector} · {item.text.slice(0, 220)}…</div></div>)}</div></div>}</div></Shell>;
}

function ResearchWorkspace() {
  const [documents, setDocuments] = useState<{ name: string; chunks: number }[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [question, setQuestion] = useState("How can MCTS help select evidence?");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Upload PDF or TXT files to begin.");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch("/api/rag/documents").then(response => response.json()).then(data => setDocuments(data.documents ?? [])).catch(() => undefined); }, []);
  const toBase64 = async (file: File) => { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ""; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(binary); };
  const upload = async (list: FileList | null) => { const selected = Array.from(list ?? []); if (!selected.length) return; setUploading(true); setFiles([]); setStatus(`Indexing ${selected.length} document${selected.length > 1 ? "s" : ""}…`); try { const uploaded = []; for (const file of selected) { const response = await fetch("/api/rag/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, data: await toBase64(file) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Upload failed"); uploaded.push(data.document); } const refreshed = await fetch("/api/rag/documents").then(response => response.json()); const ready = refreshed.documents ?? uploaded; setDocuments(ready); setFiles(uploaded.map(document => document.name)); setStatus(`${uploaded.length} document${uploaded.length > 1 ? "s" : ""} indexed and ready for questions.`); } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed."); } finally { setUploading(false); } };
  const ask = async () => { if (!question.trim() || uploading || loading) return; setLoading(true); setStatus("Retrieving, reranking, selecting, and verifying…"); try { let response = await fetch("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); let data = await response.json(); if (response.status === 409) { const refreshed = await fetch("/api/rag/documents").then(item => item.json()); setDocuments(refreshed.documents ?? []); if ((refreshed.documents ?? []).length) { response = await fetch("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); data = await response.json(); } } if (!response.ok) throw new Error(data.error ?? "Query failed"); setResult(data); localStorage.setItem("axiomrag:last-result", JSON.stringify(data)); setStatus(data.abstained ? "AxiomRAG recommends abstaining for this question." : "Answer verified against the selected evidence."); } catch (error) { setStatus(error instanceof Error ? error.message : "Query failed."); } finally { setLoading(false); } };
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Simple document assistant</div><h1>Ask your documents.</h1><p>Upload a file, ask a question, and get an answer with the exact sources used.</p></div><div className="workspace-grid"><div className="card form-card"><div className="section-head"><div><h3>Step 1 · Upload a document</h3><span className="tiny muted">{status}</span></div><UploadCloud size={20} color="#75b7ff" /></div><label className="dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); upload(event.dataTransfer.files); }}><UploadCloud size={28} /><strong>Drop a PDF or TXT here</strong><span>or click to choose a file</span><input ref={inputRef} className="file-input" aria-label="Choose PDF or TXT documents" type="file" accept=".pdf,.txt" multiple onChange={event => { const input = event.currentTarget; const files = input.files; void upload(files); input.value = ""; }} /></label><button className="btn btn-primary" onClick={() => inputRef.current?.click()}><Plus size={15} /> Choose document</button>{files.map(file => <div className="evidence-item" key={file}><div className="evidence-label"><span><FileText size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{file}</span><CheckCircle2 size={14} color="#63dba6" /></div></div>)}<div className="workspace-corpus"><span className="eyebrow">Your documents</span><strong>{documents.length} document{documents.length === 1 ? "" : "s"} ready</strong><span className="tiny muted">You can ask questions after uploading.</span></div></div><div className="card answer-block workspace-answer"><div className="section-head"><div><div className="eyebrow">Step 2 · Ask a question</div><h3 style={{ marginTop: 7 }}>What would you like to know?</h3></div><Search size={19} color="#75b7ff" /></div><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Example: What is the main idea of this document?" /><button className="btn btn-primary" disabled={loading || uploading} onClick={ask}><Zap size={15} /> {uploading ? "Indexing document…" : loading ? "Checking your documents…" : "Ask question"}</button>{result && <div className="workspace-result"><div className="section-head"><span className="eyebrow" style={{ color: result.abstained ? "#f3c16e" : "#79b9ff" }}>{result.abstained ? "Not enough information" : "Answer"}</span><span className={`status ${result.abstained ? "amber" : "green"}`}>{Math.round(result.reliability * 100)}% confidence</span></div><p>{result.answer}</p><div className="eyebrow" style={{ marginTop: 18 }}>Sources used</div>{result.evidence.filter((item: any) => { const strongest = Math.max(...result.evidence.map((candidate: any) => candidate.rerank ?? 0)); return result.claims.some((claim: any) => claim.citations?.some((citation: any) => citation.document === item.document)) && (item.rerank ?? 0) >= strongest * 0.35; }).slice(0, 3).map((item: any) => <div className="evidence-item" key={item.id}><div className="evidence-label"><span><FileText size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{item.document}</span><span className="tiny muted">source</span></div><div className="muted tiny">{item.text.slice(0, 180)}…</div></div>)}<details className="technical-details"><summary>Show technical details</summary>{result.claims.map((claim: any) => <div className={`claim ${claim.status !== "Supported" ? "warn" : ""}`} key={claim.id}><strong>{claim.id} · {claim.status}</strong><div className="tiny" style={{ marginTop: 5 }}>{claim.text}</div><span className="muted tiny">{claim.reason} · support {Math.round(claim.support * 100)}%</span></div>)}{result.trace?.stages?.map((stage: any) => <div className="evidence-item" key={stage.name}><div className="evidence-label"><span><Check size={13} color="#63dba6" style={{ verticalAlign: "-2px", marginRight: 6 }} />{stage.name}</span><span className="tiny muted">{stage.detail}</span></div></div>)}</details></div>}</div></div></div></Shell>;
}

function Verification() {
  const [result, setResult] = useState<any>(() => { try { return JSON.parse(localStorage.getItem("axiomrag:last-result") ?? "null"); } catch { return null; } });
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Workspace / Verification</div><h1>Claim-level observability.</h1><p>Inspect the checks behind each response and see where the system chose to correct or abstain.</p></div>{!result ? <div className="card form-card"><ShieldCheck size={28} color="#75b7ff" /><h3 style={{ marginTop: 15 }}>No query trace yet.</h3><p className="muted tiny" style={{ lineHeight: 1.7 }}>Upload a document, ask a question, and this page will show the real retrieved evidence, claim support, reliability score, and abstention decision.</p><Link href="/query" className="btn btn-primary">Open RAG Query <ArrowRight size={14} /></Link></div> : <div className="grid content-grid"><div className="card answer-block" style={{ marginTop: 0 }}><div className="section-head"><div><span className="eyebrow">Latest query trace</span><h2 style={{ marginTop: 8, fontSize: 20 }}>{result.question}</h2></div><span className={`status ${result.abstained ? "amber" : "green"}`}>{result.abstained ? "ABSTAINED" : "VERIFIED"}</span></div>{result.claims.map((claim: any) => <div className={`claim ${claim.status === "Flagged" ? "warn" : ""}`} key={claim.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 15, marginBottom: 6 }}><strong>{claim.id} · {claim.status}</strong><span className="mono tiny">Support {Math.round(claim.support * 100)}%</span></div><div>{claim.text}</div><span className="muted tiny">{claim.reason}</span></div>)}</div><div className="card evidence-card"><div className="section-head"><div><h3>Reliability model</h3><span className="tiny muted">Computed from live trace</span></div><Gauge size={18} color="#9c7bff" /></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Final reliability</span><span className="mono">{Math.round(result.reliability * 100)}%</span></div></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Retrieved chunks</span><span className="mono">{result.evidence.length}</span></div></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Policy decision</span><span className="mono" style={{ color: result.abstained ? "#f3c16e" : "#74dcae" }}>{result.abstained ? "ABSTAIN" : "ANSWER"}</span></div></div><Link href="/query" className="btn btn-secondary" style={{ marginTop: 15 }}>Run another query <ArrowRight size={14} /></Link></div></div>}</div></Shell>;
}

function Evaluation() {
  const [metric, setMetric] = useState("Reliability");
  const [summary, setSummary] = useState({ runs: 0, reliability: 0, hallucinationRate: 0, abstentionRate: 0, correctionRate: 0 });
  const [runs, setRuns] = useState<any[]>([]);
  const [policy, setPolicy] = useState({ minReliability: 0.68, abstainBelow: 0.62, maxEvidenceChunks: 3 });
  useEffect(() => { fetch("/api/rag/evaluation").then(response => response.json()).then(setSummary).catch(() => undefined); fetch("/api/rag/runs").then(response => response.json()).then(data => setRuns(data.runs ?? [])).catch(() => undefined); fetch("/api/rag/settings").then(response => response.json()).then(setPolicy).catch(() => undefined); }, []);
  const chartValues = runs.length ? runs.slice(0, 8).reverse().map(run => Math.round((metric === "Reliability" ? run.reliability : metric === "Faithfulness" ? Math.max(0, run.reliability - 0.03) : Math.max(0, run.reliability - 0.01)) * 100)) : [];
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">Workspace / Evaluation</div><h1>Measure what matters.</h1><p>Track whether answers are supported, calibrated, and willing to abstain when the corpus is incomplete.</p></div><div className="grid stats-grid"><Stat label="Average reliability" value={summary.runs ? `${Math.round(summary.reliability * 100)}%` : "—"} change={`${summary.runs} real query runs`} icon={CheckCircle2} /><Stat label="Correction rate" value={summary.runs ? `${Math.round(summary.correctionRate * 100)}%` : "—"} change="Runs needing self-correction" icon={RotateCcw} /><Stat label="Abstention rate" value={summary.runs ? `${Math.round(summary.abstentionRate * 100)}%` : "—"} change="Policy decisions" icon={Gauge} /><Stat label="Hallucination rate" value={summary.runs ? `${Math.round(summary.hallucinationRate * 100)}%` : "—"} change="Unsupported or contradicted claims" icon={ShieldCheck} /></div><div className="grid content-grid"><div className="card"><div className="card-pad section-head"><div><h3>Evaluation history</h3><span className="tiny muted">{summary.runs ? `${summary.runs} saved query runs` : "Run queries to populate history"} · {metric}</span></div><select className="field" style={{ width: 150, margin: 0, padding: "8px 10px" }} value={metric} onChange={e => setMetric(e.target.value)}><option>Reliability</option><option>Faithfulness</option><option>Relevance</option></select></div>{chartValues.length ? <><div className="chart">{chartValues.map((height, i) => <div key={i} className="bar" style={{ height: `${height}%` }} />)}</div><div className="chart-labels">{runs.slice(0, 8).reverse().map(run => <span key={run.id}>{new Date(run.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}</div></> : <div className="empty-state">No saved runs yet. Ask a question in the workspace to start measuring.</div>}</div><div className="card evidence-card"><div className="section-head"><div><h3>Active evaluation policy</h3><span className="tiny muted">Applied to new query runs</span></div><Settings size={17} color="#75b7ff" /></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Minimum reliability</span><span className="mono">{policy.minReliability.toFixed(2)}</span></div></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Abstain below</span><span className="mono">{policy.abstainBelow.toFixed(2)}</span></div></div><div className="evidence-item"><div className="evidence-label"><span className="muted">Max evidence chunks</span><span className="mono">{policy.maxEvidenceChunks}</span></div></div><Link href="/settings" className="btn btn-secondary" style={{ marginTop: 15 }}>Tune policy <ArrowRight size={14} /></Link></div></div></div></Shell>;
}

function SettingsPage() {
  const [settings, setSettings] = useState({ minReliability: 0.68, abstainBelow: 0.62, maxEvidenceChunks: 3, requiredCitations: true });
  const [status, setStatus] = useState("Loading saved policy…");
  useEffect(() => { fetch("/api/rag/settings").then(response => response.json()).then(data => { setSettings(data); setStatus("Saved policy loaded"); }).catch(() => setStatus("Using local defaults")); }, []);
  const save = async () => { setStatus("Saving…"); const response = await fetch("/api/rag/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); setStatus(response.ok ? "Policy saved and active for new queries" : "Unable to save policy"); };
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">System / Settings</div><h1>Make the guardrails yours.</h1><p>Configure the policy used by retrieval, verification, self-correction, and abstention.</p></div><div className="card form-card"><h3>Reliability & abstention</h3><p className="muted tiny" style={{ margin: "7px 0 20px" }}>{status}</p><label className="label">Minimum answer reliability</label><input className="field" type="number" min="0" max="1" step="0.01" value={settings.minReliability} onChange={event => setSettings({ ...settings, minReliability: Number(event.target.value) })} /><label className="label">Abstention threshold</label><input className="field" type="number" min="0" max="1" step="0.01" value={settings.abstainBelow} onChange={event => setSettings({ ...settings, abstainBelow: Number(event.target.value) })} /><label className="label">Maximum evidence chunks</label><input className="field" type="number" min="1" max="8" step="1" value={settings.maxEvidenceChunks} onChange={event => setSettings({ ...settings, maxEvidenceChunks: Number(event.target.value) })} /><div style={{ display: "flex", alignItems: "center", gap: 10, color: "#bad0e9", fontSize: 12, margin: "2px 0 22px" }}><input type="checkbox" checked={settings.requiredCitations} onChange={event => setSettings({ ...settings, requiredCitations: event.target.checked })} /> Require claim-level citations in every answer</div><button className="btn btn-primary" onClick={save}>Save active policy</button></div></div></Shell>;
}

function About() {
  const features = [[Network,"Hybrid retrieval","BM25 precision meets semantic vector recall for resilient evidence discovery."],[GitBranch,"MCTS selection","Explore candidate evidence paths and keep only the context that earns its place."],[ShieldCheck,"Claim verification","Test each generated claim against sources, contradictions, and entailment signals."],[RotateCcw,"Self-correction","Rewrite, soften, or abstain when the evidence cannot carry the answer."],[BarChart3,"Evaluation loop","Track faithfulness, relevance, calibration, and hallucination over time."],[LockKeyhole,"Research-ready","A transparent interface for teams who need to inspect the reasoning, not just the result."]];
  return <Shell><div className="page-section"><div className="page-title"><div className="eyebrow">System / About</div><h1>Evidence before confidence.</h1><p>AxiomRAG is a final-year research project exploring how retrieval augmented generation can become more self-aware, more transparent, and more useful for serious knowledge work.</p></div><div className="grid feature-grid">{features.map(([Icon,title,description]) => <div className="card feature-card" key={title as string}><div className="feature-icon"><Icon size={17} /></div><h3>{title as string}</h3><p>{description as string}</p></div>)}</div><div className="card" style={{ marginTop: 16, padding: 24, display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}><div><span className="eyebrow">Project note</span><h3 style={{ marginTop: 8 }}>Designed for inspectable intelligence.</h3><p className="muted tiny" style={{ maxWidth: 580, lineHeight: 1.7 }}>The interface is intentionally organized around traceability: pipeline stages, source agreement, claim checks, and calibrated decisions remain visible alongside the answer.</p></div><Link href="/dashboard" className="btn btn-primary">Open workspace <ArrowRight size={15} /></Link></div></div></Shell>;
}

function Login() {
  return <div className="login-page login-reference"><video className="shell-art" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" /><div className="shell-veil" /><div className="card login-card"><Link href="/"><Logo /></Link><h1>Welcome back.</h1><p>Sign in to upload documents, ask grounded questions, and inspect every verification step.</p><button className="btn btn-primary" style={{ width: "100%", marginTop: 2 }} onClick={() => startLogin()}>Continue with Manus <ArrowRight size={15} /></button><div style={{ textAlign: "center", marginTop: 22 }}><span className="tiny muted">Your research workspace stays private and inspectable.</span></div></div></div>;
}

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { const query = window.matchMedia?.("(prefers-reduced-motion: reduce)"); const sync = () => { if (!videoRef.current) return; if (query?.matches) videoRef.current.pause(); else videoRef.current.play().catch(() => undefined); }; sync(); query?.addEventListener?.("change", sync); return () => query?.removeEventListener?.("change", sync); }, []);
  return <div className="landing-neural"><video ref={videoRef} className="landing-art" autoPlay muted loop playsInline preload="auto" aria-hidden="true" poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" /><div className="landing-veil" /><header className="landing-bar"><Link className="landing-brand" href="/" onClick={() => setMenuOpen(false)}><svg viewBox="0 0 23 17" aria-hidden="true"><path d="M8.15 .9H4.55L.5 9.3h3.6zM17 0h-3.6L6.15 16.4h3.6zM22.9 0h-3.6L15 7.6h3.6zM22.6 6.9H19l-4.95 9.5h3.6z" /></svg><span>AXIOMRAG</span></Link><button className={`landing-burger ${menuOpen ? "is-open" : ""}`} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><i /><i /><i /></button><div className={`landing-nav ${menuOpen ? "is-open" : ""}`}><nav><Link href="/about" onClick={() => setMenuOpen(false)}>About</Link><Link href="/workspace" onClick={() => setMenuOpen(false)}>Workspace</Link><Link href="/about#how-it-works" onClick={() => setMenuOpen(false)}>How it works <ChevronRight size={13} /></Link></nav><Link className="landing-login" href="/login" onClick={() => setMenuOpen(false)}>Log in / Request access <ArrowRight size={14} /></Link><Link className="landing-pill" href="/workspace" onClick={() => setMenuOpen(false)}>Open workspace</Link></div></header><main className="landing-hero"><h1><span>Evidence-First Intelligence.</span><span>Answers You Can Defend.</span></h1><p><span>Retrieve, verify, and self-correct</span><span>before confidence becomes a claim.</span></p><Link className="landing-cta" href="/workspace">Ask your documents <ArrowRight size={17} /></Link><ul><li><ChevronRight size={15} /> Hybrid retrieval</li><li><ChevronRight size={15} /> MCTS evidence selection</li><li><ChevronRight size={15} /> Claim-level verification</li><li><ChevronRight size={15} /> Safe abstention</li></ul><span className="landing-rule" /></main><footer className="landing-foot"><span>Built for students, researchers, and AI/ML teams.</span><span>AXIOMRAG · 2026</span></footer></div>;
}

function Router() {
  return <Switch><Route path="/" component={Landing} /><Route path="/login" component={Login} /><Route path="/dashboard" component={Dashboard} /><Route path="/workspace" component={ResearchWorkspace} /><Route path="/upload" component={Upload} /><Route path="/query" component={Query} /><Route path="/verification" component={Verification} /><Route path="/evaluation" component={Evaluation} /><Route path="/settings" component={SettingsPage} /><Route path="/about" component={About} /><Route component={Dashboard} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
