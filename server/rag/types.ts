export type Settings = { minReliability: number; abstainBelow: number; maxEvidenceChunks: number; requiredCitations: boolean };
export type DocumentRecord = { id: string; name: string; type: string; size: number; chunks: number; addedAt: string };
export type Chunk = { id: string; documentId: string; document: string; text: string; terms: Record<string, number> };
export type QueryRun = { id: string; question: string; createdAt: string; reliability: number; abstained: boolean; hallucinationRate: number; corrections: number };
export type State = { documents: DocumentRecord[]; chunks: Chunk[]; runs: QueryRun[]; settings: Settings };
export type ScoredChunk = Chunk & { bm25: number; vector: number; fused: number; rerank: number };
export type DbDocument = { id: string; name: string; mime_type: string; file_size: number | string; chunk_count: number; added_at: Date | string };
export type DbChunk = { id: string; document_id: string; document_name: string; chunk_text: string; terms: Record<string, number> | string };
export type DbRun = { id: string; question: string; created_at: Date | string; reliability: number | string; abstained: number; hallucination_rate: number | string; corrections: number };

export const defaultSettings: Settings = {
  minReliability: 0.68,
  abstainBelow: 0.62,
  maxEvidenceChunks: 3,
  requiredCitations: true,
};
