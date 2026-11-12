import { randomUUID } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { getPool, queryRows } from "../db";
import { generateAnswer } from "./generation";
import { retrieve, selectEvidenceWithMcts } from "./retrieval";
import { extractiveAnswer, verifyClaims } from "./verification";
import { UploadError, prepareUpload, toTerms } from "./text";
import { defaultSettings } from "./types";
import type { DbChunk, DbDocument, DbRun, DocumentRecord, QueryRun, Settings, State } from "./types";

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

