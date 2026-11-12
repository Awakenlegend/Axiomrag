# AxiomRAG — Separate Fix Copy

This is a separate restoration of the saved AxiomRAG source. The original public website and its project remain unchanged. The workspace is open in Preview for testing; sign-in is not configured in this separate copy yet.

The React/Vite interface is served by Express. PDF/TXT documents are extracted and indexed into the new project's managed MySQL database; the document list, retrieval, and query routes read that same database. The searchable corpus is not stored in a process-local JSON file. The default minimum answer reliability is calibrated to 0.68 based on supported, cited test answers; claim-level citations remain required, and lower-confidence responses continue to abstain.

## Commands

- `pnpm dev` starts the Express/Vite development server on the configured port.
- `pnpm check` runs TypeScript diagnostics.
- `pnpm test` runs the RAG chunking tests.
- `pnpm db:migrate` applies the additive RAG schema migration.
- `pnpm build` checks types, builds the frontend, and bundles the server.
- `pnpm start` runs the production server.

The server requires the project's managed `DATABASE_URL`; LLM answer generation uses `MANUS_API_URL` and `MANUS_API_KEY` when provided and retains an extractive evidence-based fallback. PDF extraction uses `pdftotext` (provided in the production container by Poppler utilities).
