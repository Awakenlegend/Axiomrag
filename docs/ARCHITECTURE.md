# Architecture overview

AxiomRAG is a React client and Express API maintained in one pnpm project. The frontend is organized by route-level pages and shared components. The backend separates document processing, retrieval, verification, generation, and API orchestration into focused modules.

## Request flow

1. The client uploads a PDF or TXT file to `POST /api/rag/upload`.
2. `server/rag/text.ts` validates the upload, extracts text, chunks it, and derives token-frequency terms.
3. `server/rag/routes.ts` persists document metadata and chunks in MySQL.
4. A query sent to `POST /api/rag/query` is processed by `server/rag/retrieval.ts`, which combines BM25 and token-frequency cosine similarity, applies heuristic reranking, and selects evidence with the custom bounded MCTS-style routine.
5. `server/rag/generation.ts` calls the configured Manus LLM integration to generate an answer from selected passages. If unavailable, it uses an extractive fallback.
6. `server/rag/verification.ts` compares answer sentences with selected passages using lexical overlap and token-vector similarity.
7. The API applies the current rule-based correction policy, reliability calculation, citation requirement, and abstention decision.

## Code ownership

### Frontend

- `client/src/pages/`: route-level screens.
- `client/src/components/`: shared application shell, metric cards, and pipeline overview.
- `client/src/contexts/`: React context providers.
- `client/src/App.tsx`: route registration and top-level providers.

### Backend

- `server/index.ts`: Express setup, health endpoint, API registration, and frontend hosting.
- `server/rag/text.ts`: upload validation, PDF/TXT extraction, chunking, and text utilities.
- `server/rag/retrieval.ts`: BM25, token-vector scoring, heuristic reranking, and evidence selection.
- `server/rag/generation.ts`: Manus LLM request and extractive fallback.
- `server/rag/verification.ts`: sentence-level heuristic checks and extractive answer helper.
- `server/rag/routes.ts`: RAG endpoints, database reads/writes, correction policy, and response assembly.
- `server/rag/types.ts`: shared data types and default settings.
- `server/rag.ts`: stable public exports used by the server and tests.
- `server/db.ts`: MySQL connection pool and SQL migration runner.
- `server/_core/llm.ts`: optional OpenAI-compatible Manus LLM gateway client.

### Supporting files

- `drizzle/`: database schema and SQL migration.
- `scripts/`: operational scripts.
- `server/fixtures/`: sample documents used by tests.
- `.env.example`: local environment variable template.
- `.github/workflows/ci.yml`: dependency install, tests, and production build.

## Implementation boundary

The current vector representation, reranker, and claim verifier are heuristic/token-frequency methods. They are not neural dense embeddings, a learned cross-encoder, or a trained NLI model. The current correction loop filters answer sentences; it does not yet perform a complete claim-targeted corrective retrieval cycle. The MCTS-style selector is a custom bounded candidate-selection routine, not an NLI-guided MCTS implementation.

See the root [README](../README.md) for setup instructions, API routes, limitations, and the planned research direction.
