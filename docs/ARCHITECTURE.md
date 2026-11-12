# Architecture overview

AxiomRAG is organized as a React client and an Express API in one pnpm project.

## Request flow

1. The client uploads a PDF or TXT file to `POST /api/rag/upload`.
2. The server extracts text, chunks it, derives token-frequency terms, and stores document and chunk records in MySQL.
3. A query sent to `POST /api/rag/query` is scored with BM25 and token-frequency cosine similarity.
4. Candidate passages are reranked heuristically and passed to a bounded MCTS-style evidence-selection routine.
5. The configured Manus LLM integration generates an answer from selected passages. If it is unavailable, the server uses an extractive fallback.
6. Answer sentences are checked against selected passages using lexical overlap and token-vector similarity.
7. The current rule-based correction policy may filter unsupported sentences for up to two passes; the configured reliability and citation policy may cause abstention.

## Code ownership

- `client/src/pages/`: route-level screens.
- `client/src/components/`: shared layout, metrics, and pipeline presentation.
- `client/src/contexts/`: client context providers.
- `server/index.ts`: Express setup, health endpoint, API registration, and frontend hosting.
- `server/rag.ts`: document processing, retrieval, evidence selection, answer generation, claim checks, and RAG endpoints.
- `server/db.ts`: MySQL pool and SQL migration runner.
- `server/_core/llm.ts`: optional LLM gateway client.
- `drizzle/`: database schema and SQL migration.
- `scripts/`: operational scripts.

## Implementation boundary

The current vector representation, reranker, and claim verifier are heuristic/token-frequency methods. They are not neural dense embeddings, a learned cross-encoder, or a trained NLI model. The current correction loop filters answer sentences; it does not yet perform a complete claim-targeted corrective retrieval cycle. The MCTS-style selector is a custom bounded candidate-selection routine, not an NLI-guided MCTS implementation.

See the root [README](../README.md) for setup instructions, API routes, limitations, and the planned research direction.
