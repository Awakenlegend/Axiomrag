import { useRef, useState } from "react";
import { CheckCircle2, FileText, Plus, UploadCloud } from "lucide-react";
import { Shell } from "../components/AppShell";

export default function UploadPage() {
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

