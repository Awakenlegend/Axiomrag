# AxiomRAG — Separate Fix Copy

## Goal and scope

Restore the saved AxiomRAG website source into this new, separate Webdev project and fix the reported document-upload failure: after a PDF is uploaded, the workspace must not continue to show zero ready documents or reject a question with “Upload at least one PDF or TXT document before asking a question.” The original deployed website remains untouched.

Preserve the existing platform scope for students, researchers, and AI/ML developers: PDF/TXT upload, hybrid BM25 and vector search, reranking, MCTS evidence selection, answer generation, claim verification, hallucination detection, automatic self-correction, reliability scoring, safe abstention, and evaluation. Preserve the existing Home, Login, Dashboard, Document Upload, RAG Query, Verification Results, Evaluation, Settings, and About routes.

## Implementation approach

1. Restore the saved frontend, server, styles, route manifest, and required project configuration into the new flexible-stack project, excluding the prior Manus project identity and initialization metadata. Extend the approved home-page visual system consistently across the other routes while preserving each page's content, interactions, sidebar navigation, and data presentation.
2. Trace the end-to-end upload contract from browser file selection through `/api/rag/upload`, PDF/TXT extraction, chunk indexing, document listing, and `/api/rag/query`. Make the document list and query path read the same durable corpus instead of relying on per-process/in-container JSON state. Preserve the current retrieval, reranking, MCTS selection, answer, verification, correction, scoring, and abstention pipeline.
3. Keep ingestion failures actionable in the UI; after a successful upload, refresh the visible document list and allow questions against the indexed content. Confirm required PDF extraction support in the server runtime and retain TXT support.
4. Validate with the saved sample PDF: upload it, confirm it appears as ready, query a known fact from it, and confirm the response cites/retrieves the document. Run project type checks, tests, and build. Keep this work in the new project; do not replace or publish over the existing site.

## Architecture and project structure

- `client/src/App.tsx`: React routes and workspace UI, including file upload and query state.
- `client/src/index.css` and `client/src/main.tsx`: existing dark research-console styling and frontend entry.
- `server/_core/index.ts`: Express application setup, JSON parsing, health endpoint, static/Vite serving, and RAG route registration.
- `server/rag.ts`: PDF/TXT extraction, chunking, hybrid retrieval, reranking, MCTS evidence selection, generation, verification, and `/api/rag/*` endpoints; update persistence here and in database helpers as needed.
- `server/db.ts`, `drizzle/schema.ts`, and `drizzle/`: managed database access, durable corpus schema/migration, and migration history.
- `public/manus-routes.json`: complete page-route manifest kept synchronized with the frontend routes.
- Root manifests/configuration: package scripts and dependencies, TypeScript/Vite configuration, and deployment runtime settings.

The frontend remains React/Vite. The backend remains the project's saved Express application. The managed database is used for durable document metadata and indexed chunks so listing and querying are consistent across server requests and restarts. Document bytes are only persisted if required by the existing app flow; the RAG corpus is the durable data needed for retrieval.

## Design

Use the home page as the visual reference for every route: a near-black cinematic base, Sora editorial headlines, restrained white/silver typography, translucent glass surfaces, fine light hairlines, and softly diffused highlights. Keep electric blue and violet for meaningful data, evidence, and analysis states. Preserve the AxiomRAG wordmark, useful sidebar navigation, document workspace, status indicators, and answer/evidence presentation; make the app feel like the same product as the home page without cloning its marketing layout. Keep interactions calm and legible, make upload/indexing/ready/error feedback explicit, and preserve clear focus/hover states and phone-sized layouts.

Brand essence: Evidence-first answers for researchers, with traceable sources and explicit abstention. Personality: rigorous, calm, inspectable. Preserve the existing concise, technical-but-readable voice and current visual direction.

## Boundaries

This is a separate site/project created from saved source. The current public site, its users, its deployment, and its database must remain unchanged. No replacement or publication to the original site is included.
