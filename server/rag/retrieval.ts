import { cosine, toTerms, tokenize } from "./text";
import type { Chunk, ScoredChunk, State } from "./types";

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


