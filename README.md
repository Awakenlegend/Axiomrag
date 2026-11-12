# AxiomRAG

[![CI](https://github.com/Awakenlegend/Axiomrag/actions/workflows/ci.yml/badge.svg)](https://github.com/Awakenlegend/Axiomrag/actions/workflows/ci.yml)

**AxiomRAG** is an evidence-first Retrieval-Augmented Generation (RAG) application for asking questions over uploaded PDF and TXT documents. It is designed to retrieve relevant passages, generate answers grounded in those passages, expose supporting evidence, verify answer claims, and abstain when the available evidence does not meet the configured reliability policy.

> **Project status:** This README describes the implementation currently present in this repository. The current retrieval and verification logic includes BM25 and token-vector similarity, heuristic reranking, a custom MCTS-style evidence-selection routine, and overlap/similarity-based claim checks. These are not the same as a learned dense-embedding retriever, a neural cross-encoder reranker, or a trained Natural Language Inference (NLI) model. See [Implementation notes and limitations](#implementation-notes-and-limitations).

## Live demo

[**Open the AxiomRAG web application**](https://axiomragcopy-7atmpss6.manus.space/)

[**Source code**](https://github.com/Awakenlegend/Axiomrag)

## What it does

- **Document ingestion:** Upload PDF and TXT files. Text is extracted, divided into chunks, and indexed for retrieval.
- **Hybrid-style retrieval:** The current implementation combines a BM25 lexical score with cosine similarity over token-frequency vectors.
- **Reranking:** Candidate chunks are reordered using a heuristic score based on retrieval score, query-term overlap, and a document-title match.
- **Evidence selection:** A custom bounded search routine selects a small set of chunks using relevance, query-term coverage, and redundancy as its objective.
- **Grounded answer generation:** The server asks the configured LLM integration to answer from selected document excerpts and request source tags. If generation is unavailable or unsuitable, it falls back to an extractive answer.
- **Claim checks:** Generated sentences are assessed against selected chunks using lexical overlap and token-vector similarity. The system associates matching source chunks with claims.
- **Correction and abstention:** The query pipeline makes up to two correction passes under its current rule-based policy and can abstain when its reliability/citation policy is not met.
- **Trace and evaluation views:** The application exposes retrieval evidence, processing details, saved query runs, and aggregate run statistics through its workspace.

## How the current query pipeline works

1. **Upload and extract:** The user uploads a PDF or TXT file. PDF text extraction uses `pdftotext`; TXT files are decoded as UTF-8.
2. **Chunk and index:** Extracted text is split into chunks. The application stores document metadata and chunk text with token-frequency data in MySQL.
3. **Retrieve:** For a query, the application computes BM25 scores and cosine similarity over token-frequency vectors, then combines them into a retrieval score.
4. **Rerank:** Retrieved candidates receive an additional heuristic score based on query-term overlap and title matching.
5. **Select evidence:** The custom MCTS-style routine explores candidate chunk combinations and chooses a set intended to balance relevance, query-term coverage, and redundancy.
6. **Generate:** The server sends the question and selected excerpts to the configured LLM integration. An extractive fallback is used if generation fails or returns an unsuitable result.
7. **Check claims:** The answer is split into sentences. Each sentence is compared with selected evidence using lexical and token-vector similarity heuristics.
8. **Correct or abstain:** The current correction policy can remove unsupported/contradicted sentences for up to two passes. A reliability and citation policy determines whether to return the answer or abstain.

## Technology

| Layer | Current repository implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| UI and navigation | Wouter, Lucide icons, Radix tooltip, Sonner |
| Backend | Node.js, Express, TypeScript |
| Document extraction | `pdftotext` for PDFs; UTF-8 decoding for TXT |
| Retrieval | Custom BM25 and cosine similarity over token-frequency vectors |
| Evidence selection | Custom bounded MCTS-style selection routine |
| Answer generation | Manus LLM integration when configured; extractive fallback |
| Persistence | MySQL through `mysql2` and Drizzle ORM |
| Styling | Tailwind CSS 4 and project CSS |
| Testing | Node test runner through `tsx` |

## Repository structure

```text
Axiomrag/
├── client/
│   ├── public/
│   │   └── manus-routes.json
│   └── src/
│       ├── components/       # Shared layout and reusable UI
│       ├── contexts/         # React context providers
│       ├── pages/            # Route-level screens
│       ├── App.tsx           # Route registration and app providers
│       ├── const.ts          # Platform-specific client helpers
│       ├── index.css         # Global styles
│       └── main.tsx          # Frontend entry point
├── docs/
│   └── ARCHITECTURE.md       # Architecture and request flow
├── drizzle/
│   ├── schema.ts             # Database table definitions
│   └── *.sql                 # Versioned SQL migrations
├── scripts/                  # Database and maintenance scripts
├── server/
│   ├── _core/                # External LLM integration
│   ├── fixtures/             # Test fixture documents
│   ├── rag/
│   │   ├── generation.ts     # LLM answer generation and fallback
│   │   ├── retrieval.ts      # BM25, vector scoring, reranking, selection
│   │   ├── routes.ts         # RAG API handlers and persistence flow
│   │   ├── text.ts           # Upload validation, extraction, chunking, text utilities
│   │   ├── types.ts          # Shared RAG and database types
│   │   └── verification.ts   # Claim checks and extractive answer helper
│   ├── db.ts                 # Database connection and migrations
│   ├── index.ts              # Express server and frontend hosting
│   ├── rag.test.ts           # RAG and ingestion tests
│   └── rag.ts                # Public RAG module exports
├── .env.example              # Environment variable template
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## Getting started

### Prerequisites

- Node.js compatible with the project dependencies
- pnpm 10
- MySQL database
- `pdftotext` from Poppler utilities for PDF extraction

### Install dependencies

```bash
pnpm install
```

### Configure environment

Create your local environment file from the template:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your MySQL connection string. For LLM-backed answer generation, also set `MANUS_API_URL` and `MANUS_API_KEY` using the exact endpoint and credentials supplied by your Manus environment.

Do not commit `.env` or any real credentials. The server retains an extractive evidence-based fallback when the LLM integration is unavailable.

### Apply database migrations

```bash
pnpm db:migrate
```

### Start the development server

```bash
pnpm dev
```

### Other commands

| Command | Purpose |
|---|---|
| `pnpm check` | Run TypeScript diagnostics |
| `pnpm test` | Run the RAG chunking tests |
| `pnpm build` | Check types, build the frontend, and bundle the server |
| `pnpm start` | Start the production server |

The application uses the configured port supplied by its runtime environment.

## API overview

The current server registers the following RAG endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/rag/settings` | Read retrieval/answer policy settings |
| `PUT` | `/api/rag/settings` | Update reliability, abstention, evidence-count, and citation settings |
| `GET` | `/api/rag/documents` | List indexed documents and chunk count |
| `GET` | `/api/rag/runs` | List recent saved query runs |
| `GET` | `/api/rag/evaluation` | Return aggregate statistics from saved runs |
| `POST` | `/api/rag/upload` | Extract, chunk, and persist an uploaded PDF/TXT document |
| `POST` | `/api/rag/query` | Retrieve evidence, generate/check an answer, and return a trace |

### Upload request

The upload route expects a JSON body containing:

- `name`: uploaded filename
- `type`: MIME type
- `data`: base64 file data (a data URL is also accepted)

The current maximum upload size is 50 MB. Only PDF and TXT files are accepted.

### Query request

```json
{
  "question": "What does the uploaded document say about the topic?"
}
```

The response includes the answer, abstention flag, reliability and hallucination-rate estimates, correction count, claim checks, selected evidence with component scores, and a processing trace. These values are outputs of the application's current heuristics and configured model integration; they should not be interpreted as calibrated probabilities or validated scientific truth scores.

## Application pages

The interface includes routes and views for the document workspace, dashboard, document upload, RAG query, claim verification, evaluation, settings, and project information. The workspace is intended to let users move from uploaded sources to questions and inspect the evidence used in responses.

## Configuration

The current default RAG settings in the server are:

| Setting | Default | Description |
|---|---:|---|
| Minimum reliability | `0.68` | Minimum reliability value required by the current answer policy |
| Abstain below | `0.62` | Configured abstention threshold; the query route also enforces the minimum reliability setting |
| Maximum evidence chunks | `3` | Maximum selected chunks passed through the evidence-selection stage |
| Required citations | `true` | Require each returned claim to have at least one citation |

These are application policy settings, not experimentally calibrated guarantees of factual correctness.

## Implementation notes and limitations

It is important to distinguish the current repository implementation from the broader research direction:

- The current “dense” similarity is cosine similarity over token-frequency vectors, not a neural text-embedding model.
- The current reranker is heuristic; it is not a trained cross-encoder.
- The current claim verifier uses lexical overlap and token-vector similarity. It is not a trained NLI classifier and does not perform robust semantic entailment/contradiction inference.
- The evidence-selection routine is a custom bounded MCTS-style search over candidate chunk sets. Its objective is based on heuristic relevance, query-term coverage, and redundancy; it is not a learned NLI-guided reward.
- The answer generator calls the configured Manus LLM integration, not Qwen 2.5 in the code currently inspected. Qwen 2.5 is not shown as integrated in this repository version.
- Reliability and hallucination-rate values are heuristic application estimates. They are not calibrated probabilities or substitutes for benchmark evaluation.
- The correction loop currently filters sentences using the same heuristic claim checks and has a maximum of two passes. It does not yet implement a full corrective retrieval cycle for unsupported claims.
- The current evaluation endpoint aggregates saved application runs; it is not a reproducible benchmark evaluation against SciFact or a conventional RAG baseline.

These limitations do not prevent the application from serving as a document-grounded RAG prototype. They identify what must be strengthened and experimentally validated before claiming neural NLI verification, Qwen-based generation, adaptive corrective retrieval, or benchmark-proven improvements.

## Research direction

The broader project investigates how explicit evidence verification and bounded correction can improve the reliability of RAG responses. Planned research extensions include:

1. Neural dense embeddings and a learned cross-encoder reranker.
2. A trained NLI model for claim–evidence entailment, contradiction, and neutral classification.
3. Claim-targeted corrective retrieval and regeneration with explicit stopping rules.
4. Qwen 2.5 integration as the configured answer generator.
5. Evaluation on labelled scientific claim/evidence data such as SciFact, with a clearly defined conventional RAG baseline.
6. Measurement of evidence support, verification quality, correction success, abstention, latency, and computational cost.
7. Further investigation of MCTS for corrective-action selection, subject to implementation and experimental validation.

## Contributing

Contributions and issue reports are welcome. Please include reproduction steps, relevant logs, and expected versus actual behavior for bug reports. Avoid including uploaded private documents, database credentials, or API keys in issues.

## License

No license file was present in the repository when this README was prepared. Unless a license is added, reuse and redistribution are not automatically granted.

## Acknowledgements

AxiomRAG is developed as an academic project exploring evidence-grounded retrieval, answer verification, and self-correction.
