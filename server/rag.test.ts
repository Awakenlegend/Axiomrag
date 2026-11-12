import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  extractiveAnswer,
  chunkText,
  prepareUpload,
  retrieve,
  selectEvidenceWithMcts,
  tokenize,
  verifyClaims,
} from "./rag";
import { UploadError as RagUploadError } from "./rag";

function makeTerms(text: string): Record<string, number> {
  return tokenize(text).reduce<Record<string, number>>((terms, token) => {
    terms[token] = (terms[token] ?? 0) + 1;
    return terms;
  }, {});
}

function makeState() {
  const id = "fixture-document-1";
  const text = "Hybrid retrieval combines lexical search and semantic vector search. This allows the system to find passages that use matching words and passages with related meanings.";
  const document = {
    id,
    name: "research-notes.txt",
    type: "text/plain",
    size: text.length,
    chunks: 1,
    addedAt: "2026-01-01T00:00:00.000Z",
  };
  const chunk = {
    id: `${id}-0`,
    documentId: id,
    document: document.name,
    text,
    terms: makeTerms(text),
  };
  return {
    documents: [document],
    chunks: [chunk],
    runs: [],
    settings: { minReliability: 0.68, abstainBelow: 0.62, maxEvidenceChunks: 3, requiredCitations: true },
  };
}

test("chunkText keeps short non-empty documents searchable", () => {
  const text = "MCTS selects evidence by balancing coverage and redundancy.";
  const chunks = chunkText(text);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], text);
});

test("chunkText returns no chunks for empty text", () => {
  assert.deepEqual(chunkText(" \n  "), []);
});

test("tokenize preserves the domain terms used by RAG retrieval", () => {
  assert.deepEqual(tokenize("Hybrid retrieval combines BM25 and vector search."), ["hybrid", "retriev", "combin", "bm25", "vector", "search"]);
});

test("TXT upload preparation strips a UTF-8 BOM, sanitizes the filename, and creates searchable chunks", async () => {
  const text = "Hybrid retrieval combines lexical and semantic search.";
  const encoded = `data:text/plain;base64,${Buffer.from(`\uFEFF${text}`).toString("base64")}`;
  const prepared = await prepareUpload("C:\\research\\notes.txt", "text/plain", encoded);

  assert.equal(prepared.name, "notes.txt");
  assert.equal(prepared.type, "text/plain");
  assert.equal(prepared.parts.length, 1);
  assert.match(prepared.parts[0], /Hybrid retrieval combines/);
});

test("PDF upload preparation extracts searchable text from a real PDF fixture", async () => {
  const pdf = await readFile(new URL("./fixtures/hybrid-retrieval.pdf", import.meta.url));
  const prepared = await prepareUpload("hybrid-retrieval.pdf", "application/pdf", pdf.toString("base64"));

  assert.equal(prepared.name, "hybrid-retrieval.pdf");
  assert.ok(prepared.parts.length > 0);
  assert.match(prepared.parts.join(" "), /Hybrid retrieval combines lexical search and semantic vector search/);
});

test("upload preparation rejects missing, unsupported, empty, unreadable, and corrupt files with actionable status codes", async () => {
  await assert.rejects(prepareUpload(undefined, "text/plain", "eA=="), (error: unknown) => error instanceof RagUploadError && error.status === 400 && /Choose a PDF or TXT/.test(error.message));
  await assert.rejects(prepareUpload("notes.csv", "application/octet-stream", "eA=="), (error: unknown) => error instanceof RagUploadError && error.status === 415 && /Only PDF and TXT/.test(error.message));
  await assert.rejects(prepareUpload("empty.txt", "text/plain", ""), (error: unknown) => error instanceof RagUploadError && error.status === 400 && /empty or invalid/.test(error.message));
  await assert.rejects(prepareUpload("blank.txt", "text/plain", Buffer.from(" \n ").toString("base64")), (error: unknown) => error instanceof RagUploadError && error.status === 422 && /No readable text/.test(error.message));
  await assert.rejects(prepareUpload("broken.pdf", "application/pdf", Buffer.from("not a PDF").toString("base64")), (error: unknown) => error instanceof RagUploadError && error.status === 422 && /PDF could not be read/.test(error.message));
});

test("retrieval returns matching passages and no candidates for an unrelated question", () => {
  const state = makeState();
  const matching = retrieve("What is hybrid retrieval?", state);
  const unrelated = retrieve("Mars revenue megacorporation", state);

  assert.ok(matching.reranked.length > 0);
  assert.equal(matching.reranked[0].document, "research-notes.txt");
  assert.deepEqual(unrelated.candidates, []);
  assert.deepEqual(unrelated.reranked, []);
});

test("MCTS selects retrieved evidence and the extractive fallback answers from that evidence", () => {
  const retrieval = retrieve("What is hybrid retrieval?", makeState());
  const selection = selectEvidenceWithMcts(retrieval.reranked, retrieval.queryTerms, 3);
  const answer = extractiveAnswer("What is hybrid retrieval?", selection.selected);

  assert.ok(selection.simulations > 0);
  assert.ok(selection.selected.length > 0);
  assert.match(answer, /Hybrid retrieval combines lexical search and semantic vector search/);
});

test("claim verification cites supporting evidence and marks unsupported claims without evidence", () => {
  const retrieval = retrieve("What is hybrid retrieval?", makeState());
  const supported = verifyClaims("Hybrid retrieval combines lexical search and semantic vector search.", retrieval.reranked);
  const unsupported = verifyClaims("Mars has a profitable lunar research program.", []);

  assert.equal(supported.claims[0].status, "Supported");
  assert.ok(supported.claims[0].citations.some(citation => citation.document === "research-notes.txt"));
  assert.equal(unsupported.claims[0].status, "Unsupported");
  assert.deepEqual(unsupported.claims[0].citations, []);
  assert.equal(unsupported.hallucinationRate, 1);
});
