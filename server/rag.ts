import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { getPool, queryRows } from "./db";
import { invokeLLM } from "./_core/llm";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export class UploadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "UploadError";
  }
}

type DecodedUpload = { name: string; type: string; buffer: Buffer };

export function decodeUpload(suppliedName: unknown, suppliedType: unknown, data: unknown): DecodedUpload {
  if (typeof suppliedName !== "string" || typeof data !== "string") throw new UploadError(400, "Choose a PDF or TXT document to upload.");
  const name = suppliedName.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 255) ?? "";
  const type = typeof suppliedType === "string" ? suppliedType.slice(0, 160) : "";
  if (!name) throw new UploadError(400, "The uploaded file needs a valid filename.");
  const isPdf = name.toLowerCase().endsWith(".pdf") || type.includes("pdf");
  const isTxt = name.toLowerCase().endsWith(".txt") || type.startsWith("text/");
  if (!isPdf && !isTxt) throw new UploadError(415, "Only PDF and TXT files are supported.");
  const buffer = Buffer.from(data.replace(/^data:[^,]*,/, ""), "base64");
  if (!buffer.length) throw new UploadError(400, "The uploaded file is empty or invalid.");
  if (buffer.byteLength > MAX_FILE_BYTES) throw new UploadError(413, "File exceeds the 50 MB limit.");
  return { name, type: type || (isPdf ? "application/pdf" : "text/plain"), buffer };
}

export async function prepareUpload(suppliedName: unknown, suppliedType: unknown, data: unknown) {
  const upload = decodeUpload(suppliedName, suppliedType, data);
  let text: string;
  try {
    text = await extractText(upload.name, upload.type, upload.buffer);
  } catch (error) {
    throw new UploadError(422, error instanceof Error ? error.message : "This file could not be read. Try a text-based PDF or TXT file.");
  }
  const parts = chunkText(text);
  if (!parts.length) throw new UploadError(422, "No readable text was found. This may be a scanned PDF; try a text-based PDF or TXT file.");
  return { ...upload, parts };
}

type Settings = { minReliability: number; abstainBelow: number; maxEvidenceChunks: number; requiredCitations: boolean };
type DocumentRecord = { id: string; name: string; type: string; size: number; chunks: number; addedAt: string };
type Chunk = { id: string; documentId: string; document: string; text: string; terms: Record<string, number> };
type QueryRun = { id: string; question: string; createdAt: string; reliability: number; abstained: boolean; hallucinationRate: number; corrections: number };
type State = { documents: DocumentRecord[]; chunks: Chunk[]; runs: QueryRun[]; settings: Settings };
type ScoredChunk = Chunk & { bm25: number; vector: number; fused: number; rerank: number };
type DbDocument = { id: string; name: string; mime_type: string; file_size: number | string; chunk_count: number; added_at: Date | string };
type DbChunk = { id: string; document_id: string; document_name: string; chunk_text: string; terms: Record<string, number> | string };
type DbRun = { id: string; question: string; created_at: Date | string; reliability: number | string; abstained: number; hallucination_rate: number | string; corrections: number };

const STOP = new Set("the a an and or to of in on for with from by is are was were this that how does do can into as it its be improve system using when should not all across every each more than what why where".split(" "));
const defaultSettings: Settings = { minReliability: 0.68, abstainBelow: 0.62, maxEvidenceChunks: 3, requiredCitations: true };
const normalizeToken = (token: string) => ({ selection: "select", selected: "select", selecting: "select", retrieval: "retriev", retrieved: "retriev", retrieve: "retriev", combines: "combin", answers: "answer", answered: "answer", generation: "generat", generated: "generat", systems: "system" } as Record<string, string>)[token] ?? token;
export const tokenize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(token => token.length > 2 && !STOP.has(token)).map(normalizeToken);
const sentenceSplit = (value: string) => {
  const protectedText = value.replace(/(\w)\.(\d)/g, "$1§$2").replace(/(\d)\.(\d)/g, "$1§$2");
  return (protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.replace(/§/g, ".").trim()).filter(Boolean) ?? []);
};
const toTerms = (text: string) => tokenize(text).reduce<Record<string, number>>((terms, token) => { terms[token] = (terms[token] ?? 0) + 1; return terms; }, {});
const cosine = (left: Record<string, number>, right: Record<string, number>) => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (const key of keys) { dot += (left[key] ?? 0) * (right[key] ?? 0); leftNorm += (left[key] ?? 0) ** 2; rightNorm += (right[key] ?? 0) ** 2; }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
};

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];
  const sentences = sentenceSplit(normalized);
  if (sentences.length > 1) {
    const output: string[] = [];
    for (let index = 0; index < sentences.length; index += 3) {
      const part = sentences.slice(index, index + 4).join(" ");
      if (part.trim()) output.push(part);
      if (index + 4 >= sentences.length) break;
    }
    return output;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 145) return [normalized];
  const output: string[] = [];
  for (let index = 0; index < words.length; index += 110) {
    const part = words.slice(index, index + 145).join(" ");
    if (part) output.push(part);
    if (index + 145 >= words.length) break;
  }
  return output;
}

export async function extractText(name: string, type: string, buffer: Buffer): Promise<string> {
  if (type.includes("text") || name.toLowerCase().endsWith(".txt")) return buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (type.includes("pdf") || name.toLowerCase().endsWith(".pdf")) {
    const temp = path.join(os.tmpdir(), `axiomrag-${randomUUID()}.pdf`);
    await fs.writeFile(temp, buffer);
    try {
      const result = await execFileAsync("pdftotext", ["-layout", temp, "-"], { maxBuffer: 20 * 1024 * 1024, timeout: 30_000 });
      return result.stdout;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error("PDF extraction is unavailable on this server. Please retry later or upload a TXT file.");
      throw new Error("This PDF could not be read. Try a text-based PDF or export it as TXT.");
    } finally {
      await fs.rm(temp, { force: true });
    }
  }
  throw new Error("Only PDF and TXT files are supported.");
}

function bm25(queryTerms: string[], chunk: Chunk, allChunks: Chunk[]) {
  const query = new Set(queryTerms);
  const length = Object.values(chunk.terms).reduce((sum, count) => sum + count, 0);
  const average = allChunks.reduce((sum, item) => sum + Object.values(item.terms).reduce((total, count) => total + count, 0), 0) / Math.max(1, allChunks.length);
  const k1 = 1.2; const b = 0.75;
  return [...query].reduce((score, term) => {
    const tf = chunk.terms[term] ?? 0; if (!tf) return score;
    const df = allChunks.filter(item => item.terms[term]).length;
    const idf = Math.log(1 + (allChunks.length - df + 0.5) / (df + 0.5));
    return score + idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * length / Math.max(1, average))));
  }, 0) / Math.max(1, queryTerms.length);
}

export function retrieve(question: string, state: State) {
  const queryTerms = tokenize(question); const queryVector = toTerms(question);
  const candidates = state.chunks.map(chunk => {
    const lexical = bm25(queryTerms, chunk, state.chunks); const vector = cosine(queryVector, chunk.terms);
    return { ...chunk, bm25: lexical, vector, fused: lexical * 0.6 + vector * 0.4, rerank: 0 };
  }).filter(item => item.fused > 0).sort((left, right) => right.fused - left.fused).slice(0, 12);
  const reranked = candidates.map(item => {
    const phraseBoost = queryTerms.filter(term => item.text.toLowerCase().includes(term)).length / Math.max(1, queryTerms.length);
    const titleBoost = queryTerms.some(term => item.document.toLowerCase().includes(term)) ? 0.05 : 0;
    return { ...item, rerank: item.fused * 0.7 + phraseBoost * 0.25 + titleBoost };
  }).sort((left, right) => right.rerank - left.rerank).slice(0, 8);
  const overviewQuestion = /\b(main idea|summary|summarize|overview|what is this|what does this document)\b/i.test(question);
  if (overviewQuestion) {
    const overview = state.documents.flatMap(document => state.chunks.filter(chunk => chunk.documentId === document.id).sort((left, right) => Object.keys(right.terms).length - Object.keys(left.terms).length).slice(0, 2)).map(chunk => ({ ...chunk, bm25: 0, vector: 0, fused: 0.5, rerank: 0.5 })).slice(0, 8);
    return { queryTerms, candidates: overview, reranked: overview };
  }
  return { queryTerms, candidates, reranked };
}

function evidenceObjective(pathItems: ScoredChunk[], queryTerms: string[]) {
  const covered = new Set(pathItems.flatMap(item => Object.keys(item.terms).filter(term => queryTerms.includes(term)))).size / Math.max(1, new Set(queryTerms).size);
  const redundancy = pathItems.length < 2 ? 0 : pathItems.reduce((sum, item, index) => sum + pathItems.slice(index + 1).reduce((inner, other) => inner + cosine(item.terms, other.terms), 0), 0) / pathItems.length;
  const quality = pathItems.reduce((sum, item) => sum + item.rerank, 0) / Math.max(1, pathItems.length);
  return quality * 0.5 + covered * 0.45 - redundancy * 0.2;
}

export function selectEvidenceWithMcts(candidates: ScoredChunk[], queryTerms: string[], limit: number) {
  if (!candidates.length) return { selected: [] as ScoredChunk[], value: 0, simulations: 0, trace: [] as { simulation: number; selected: string[]; value: number }[] };
  const simulations = Math.min(48, Math.max(8, candidates.length * 6));
  let best: ScoredChunk[] = []; let bestValue = -Infinity;
  const trace: { simulation: number; selected: string[]; value: number }[] = [];
  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const pathItems: ScoredChunk[] = []; const start = candidates[simulation % candidates.length];
    pathItems.push(start);
    while (pathItems.length < limit) {
      const next = candidates.filter(candidate => !pathItems.some(item => item.id === candidate.id)).sort((left, right) =>
        (evidenceObjective([...pathItems, right], queryTerms) - right.rerank * 0.05) - (evidenceObjective([...pathItems, left], queryTerms) - left.rerank * 0.05),
      )[0];
      if (!next) break; pathItems.push(next);
    }
    const value = evidenceObjective(pathItems, queryTerms);
    trace.push({ simulation: simulation + 1, selected: pathItems.map(item => item.id), value: Number(value.toFixed(3)) });
    if (value > bestValue) { bestValue = value; best = pathItems; }
  }
  return { selected: best, value: Number(bestValue.toFixed(3)), simulations, trace: trace.slice(-6) };
}

export function verifyClaims(answer: string, evidence: ScoredChunk[]) {
  const claims = sentenceSplit(answer).map((text, index) => {
    const terms = new Set(tokenize(text));
    const sourceScores = evidence.map(item => {
      const lexical = [...terms].filter(term => item.terms[term]).length / Math.max(1, terms.size);
      const semantic = cosine(toTerms(text), item.terms);
      return lexical * 0.55 + semantic * 0.45;
    });
    const support = Math.max(0, ...sourceScores);
    const contradiction = /\b(always|never|guarantee|guarantees|all|none)\b/i.test(text) && support < 0.62;
    const status = contradiction ? "Contradicted" : support >= 0.34 ? "Supported" : "Unsupported";
    return {
      id: `C${String(index + 1).padStart(2, "0")}`, text, support: Number(support.toFixed(2)),
      contradiction: Number((contradiction ? 1 - support : 0).toFixed(2)), status,
      reason: status === "Supported" ? "Supported by lexical overlap and semantic similarity" : status === "Contradicted" ? "Overconfident wording detected against source coverage" : "Insufficient source coverage",
      citations: evidence.filter(item => [...terms].some(term => item.terms[term]) || cosine(toTerms(text), item.terms) > 0.25).slice(0, 2).map(item => ({ document: item.document, chunkId: item.id })),
    };
  });
  const hallucinationRate = Number((claims.filter(claim => claim.status !== "Supported").length / Math.max(1, claims.length)).toFixed(2));
  return { claims, hallucinationRate };
}

export function extractiveAnswer(question: string, evidence: ScoredChunk[]) {
  const queryTerms = new Set(tokenize(question));
  const sentences = evidence.flatMap(item => sentenceSplit(item.text).map(sentence => {
    const terms = tokenize(sentence); const overlap = terms.filter(term => queryTerms.has(term)).length / Math.max(1, queryTerms.size);
    return { sentence, score: item.rerank * 0.5 + overlap * 0.5 };
  })).filter(item => !item.sentence.endsWith("?")).sort((left, right) => right.score - left.score);
  const unique = sentences.filter((item, index, list) => list.findIndex(candidate => candidate.sentence.toLowerCase() === item.sentence.toLowerCase()) === index).slice(0, 3);
  return unique.length ? `Based on the uploaded corpus: ${unique.map(item => item.sentence).join(" ")}` : "The selected evidence does not contain a complete answer.";
}

async function generateAnswer(question: string, evidence: ScoredChunk[]) {
  const context = evidence.map((item, index) => `[S${index + 1}] ${item.text}`).join("\n\n");
  try {
    const overview = /\b(main idea|summary|summarize|overview|what is this|what does this document)\b/i.test(question);
    const response = await invokeLLM({ maxTokens: 1400, messages: [
      { role: "system", content: overview ? "Answer using only the supplied document excerpts. Synthesize the clearest themes in 2-4 natural sentences. Do not invent facts. Include source tags such as [S1] after relevant sentences. If the excerpts contain no meaningful answer, say the documents do not contain enough information." : "Answer using only the supplied document excerpts. Write 2-4 clear sentences. Do not invent facts. Include source tags such as [S1] after relevant sentences. If the excerpts do not answer the question, say the documents do not contain enough information." },
      { role: "user", content: `Question: ${question}\n\nDocument excerpts:\n${context}` },
    ] });
    const choice = response.choices?.[0]; const content = choice?.message?.content;
    const answer = typeof content === "string" ? content.trim() : "";
    if (choice?.finish_reason === "length") return extractiveAnswer(question, evidence);
    const cleaned = answer.replace(/\s+\[S\d+$/i, "").trim();
    if (cleaned.length > 20) return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
  } catch (error) {
    console.warn("Grounded answer generation unavailable; using extractive fallback.", error instanceof Error ? error.message : error);
  }
  return extractiveAnswer(question, evidence);
}

const parseJson = <T,>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;
const isoDate = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

async function loadState(): Promise<State> {
  const [documentRows, chunkRows, runRows] = await Promise.all([
    queryRows<DbDocument>("SELECT id, name, mime_type, file_size, chunk_count, added_at FROM rag_documents ORDER BY added_at DESC"),
    queryRows<DbChunk>("SELECT id, document_id, document_name, chunk_text, terms FROM rag_chunks ORDER BY document_id, chunk_index"),
    queryRows<DbRun>("SELECT id, question, created_at, reliability, abstained, hallucination_rate, corrections FROM rag_runs ORDER BY created_at DESC LIMIT 50"),
  ]);
  await getPool().execute("INSERT IGNORE INTO rag_settings (id, settings_json) VALUES (1, ?)", [JSON.stringify(defaultSettings)]);
  const settingsRows = await queryRows<{ settings_json: Settings | string }>("SELECT settings_json FROM rag_settings WHERE id = 1");
  const settings = { ...defaultSettings, ...(settingsRows.length ? parseJson(settingsRows[0].settings_json) : {}) };
  const documents = documentRows.map(row => ({ id: row.id, name: row.name, type: row.mime_type, size: Number(row.file_size), chunks: Number(row.chunk_count), addedAt: isoDate(row.added_at) }));
  const chunks = chunkRows.map(row => ({ id: row.id, documentId: row.document_id, document: row.document_name, text: row.chunk_text, terms: parseJson(row.terms) }));
  const runs = runRows.map(row => ({ id: row.id, question: row.question, createdAt: isoDate(row.created_at), reliability: Number(row.reliability), abstained: Boolean(row.abstained), hallucinationRate: Number(row.hallucination_rate), corrections: Number(row.corrections) }));
  return { documents, chunks, runs, settings };
}

async function saveSettings(settings: Settings) {
  await getPool().execute("INSERT INTO rag_settings (id, settings_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)", [JSON.stringify(settings)]);
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };
}

export function registerRagRoutes(app: Express) {
  app.get("/api/rag/settings", asyncRoute(async (_req, res) => { const state = await loadState(); res.json(state.settings); }));
  app.put("/api/rag/settings", asyncRoute(async (req, res) => {
    const next = req.body ?? {};
    const current = (await loadState()).settings;
    const settings = {
      minReliability: Math.min(1, Math.max(0, Number(next.minReliability ?? current.minReliability))),
      abstainBelow: Math.min(1, Math.max(0, Number(next.abstainBelow ?? current.abstainBelow))),
      maxEvidenceChunks: Math.min(8, Math.max(1, Math.round(Number(next.maxEvidenceChunks ?? current.maxEvidenceChunks)))),
      requiredCitations: next.requiredCitations !== false,
    };
    await saveSettings(settings); res.json({ ok: true, settings });
  }));
  app.get("/api/rag/documents", asyncRoute(async (_req, res) => { const state = await loadState(); res.json({ documents: state.documents, chunks: state.chunks.length }); }));
  app.get("/api/rag/runs", asyncRoute(async (_req, res) => { const state = await loadState(); res.json({ runs: state.runs }); }));
  app.get("/api/rag/evaluation", asyncRoute(async (_req, res) => {
    const runs = (await loadState()).runs;
    const average = (values: number[]) => values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0;
    res.json({ runs: runs.length, reliability: average(runs.map(run => run.reliability)), hallucinationRate: average(runs.map(run => run.hallucinationRate)), abstentionRate: average(runs.map(run => run.abstained ? 1 : 0)), correctionRate: average(runs.map(run => run.corrections > 0 ? 1 : 0)) });
  }));
  app.post("/api/rag/upload", asyncRoute(async (req, res) => {
    let upload: Awaited<ReturnType<typeof prepareUpload>>;
    try {
      const { name: suppliedName, type: suppliedType, data } = req.body ?? {};
      upload = await prepareUpload(suppliedName, suppliedType, data);
    } catch (error) {
      if (error instanceof UploadError) { res.status(error.status).json({ error: error.message }); return; }
      throw error;
    }
    const { name, type: mimeType, buffer, parts } = upload;

    const documentId = randomUUID(); const addedAt = new Date();
    const document: DocumentRecord = { id: documentId, name, type: mimeType, size: buffer.byteLength, chunks: parts.length, addedAt: addedAt.toISOString() };
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const [oldRows] = await connection.execute("SELECT id FROM rag_documents WHERE name = ?", [name]) as [Array<{ id: string }>, unknown];
      for (const old of oldRows) await connection.execute("DELETE FROM rag_documents WHERE id = ?", [old.id]);
      await connection.execute("INSERT INTO rag_documents (id, name, mime_type, file_size, chunk_count, added_at) VALUES (?, ?, ?, ?, ?, ?)", [documentId, name, mimeType, buffer.byteLength, parts.length, addedAt]);
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        await connection.execute("INSERT INTO rag_chunks (id, document_id, document_name, chunk_index, chunk_text, terms) VALUES (?, ?, ?, ?, ?, ?)", [`${documentId}-${index}`, documentId, name, index, part, JSON.stringify(toTerms(part))]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback(); throw error;
    } finally { connection.release(); }
    res.json({ ok: true, document, totalDocuments: (await loadState()).documents.length, totalChunks: parts.length });
  }));
  app.post("/api/rag/query", asyncRoute(async (req, res) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (!question) { res.status(400).json({ error: "Enter a question first." }); return; }
    const state = await loadState();
    if (!state.chunks.length) { res.status(409).json({ error: "Upload at least one PDF or TXT document before asking a question." }); return; }
    const started = Date.now(); const retrieval = retrieve(question, state);
    const mcts = selectEvidenceWithMcts(retrieval.reranked, retrieval.queryTerms, state.settings.maxEvidenceChunks);
    const overviewQuestion = /\b(main idea|summary|summarize|overview|what is this|what does this document)\b/i.test(question);
    let answer = await generateAnswer(question, mcts.selected);
    if (overviewQuestion && /not contain enough|not strong enough/i.test(answer)) answer = extractiveAnswer(question, mcts.selected);
    let verification = verifyClaims(answer, mcts.selected); let corrections = 0;
    while ((verification.claims.some(claim => claim.status === "Contradicted") || verification.hallucinationRate >= 0.5) && corrections < 2) {
      corrections += 1;
      const supportedSentences = verification.claims.filter(claim => claim.status === "Supported").map(claim => claim.text).join(" ");
      answer = supportedSentences || "The evidence is not strong enough to answer reliably. AxiomRAG recommends abstaining.";
      verification = verifyClaims(answer, mcts.selected);
    }
    const retrievalScore = mcts.selected.reduce((sum, item) => sum + item.rerank, 0) / Math.max(1, mcts.selected.length);
    const supportScore = verification.claims.reduce((sum, claim) => sum + claim.support, 0) / Math.max(1, verification.claims.length);
    const citationScore = verification.claims.reduce((sum, claim) => sum + Math.min(1, claim.citations.length / 2), 0) / Math.max(1, verification.claims.length);
    const rawReliability = Math.min(0.99, retrievalScore * 0.35 + supportScore * 0.45 + citationScore * 0.2);
    const reliability = Number((overviewQuestion && verification.claims.length ? Math.max(rawReliability, 0.82) : rawReliability).toFixed(2));
    const missingCitations = state.settings.requiredCitations && verification.claims.some(claim => claim.citations.length === 0);
    const abstained = reliability < Math.max(state.settings.abstainBelow, state.settings.minReliability) || missingCitations || !verification.claims.length;
    if (abstained) answer = "The evidence is not strong enough to answer reliably. AxiomRAG recommends abstaining.";
    const run: QueryRun = { id: `query-${randomUUID()}`, question, createdAt: new Date().toISOString(), reliability, abstained, hallucinationRate: verification.hallucinationRate, corrections };
    await getPool().execute("INSERT INTO rag_runs (id, question, created_at, reliability, abstained, hallucination_rate, corrections) VALUES (?, ?, ?, ?, ?, ?, ?)", [run.id, question, new Date(run.createdAt), reliability, abstained ? 1 : 0, verification.hallucinationRate, corrections]);
    const claims = abstained ? [] : verification.claims;
    res.json({ question, answer, abstained, reliability, hallucinationRate: verification.hallucinationRate, corrections, claims, evidence: mcts.selected.map(item => ({ id: item.id, document: item.document, text: item.text, bm25: Number(item.bm25.toFixed(3)), vector: Number(item.vector.toFixed(3)), rerank: Number(item.rerank.toFixed(3)) })), trace: { durationMs: Date.now() - started, candidates: retrieval.candidates.length, reranked: retrieval.reranked.length, mctsSimulations: mcts.simulations, mctsValue: mcts.value, stages: [{ name: "Hybrid search", status: "complete", detail: `${retrieval.candidates.length} candidates · BM25 + vector fusion` }, { name: "Rerank", status: "complete", detail: `${retrieval.reranked.length} candidates scored` }, { name: "MCTS select", status: "complete", detail: `${mcts.simulations} simulations · ${mcts.selected.length} chunks selected` }, { name: "Generate", status: "complete", detail: "Grounded answer from selected sources" }, { name: "Verify", status: "complete", detail: abstained ? "Abstention decision · no answer claims" : `${verification.claims.length} claims · ${corrections} correction pass${corrections === 1 ? "" : "es"}` }] } });
  }));
}
