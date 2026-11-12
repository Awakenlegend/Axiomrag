import { closeDatabase, runMigrations } from "../server/db";

try {
  await runMigrations();
  console.log("RAG database migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
