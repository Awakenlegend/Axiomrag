import { bigint, datetime, decimal, int, json, mysqlTable, text, tinyint, varchar } from "drizzle-orm/mysql-core";

export const ragDocuments = mysqlTable("rag_documents", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 160 }).notNull(),
  fileSize: bigint("file_size", { mode: "number", unsigned: true }).notNull(),
  chunkCount: int("chunk_count", { unsigned: true }).notNull(),
  addedAt: datetime("added_at", { mode: "date", fsp: 3 }).notNull(),
});

export const ragChunks = mysqlTable("rag_chunks", {
  id: varchar("id", { length: 191 }).primaryKey(),
  documentId: varchar("document_id", { length: 191 }).notNull(),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  chunkIndex: int("chunk_index", { unsigned: true }).notNull(),
  chunkText: text("chunk_text", { length: "long" }).notNull(),
  terms: json("terms").$type<Record<string, number>>().notNull(),
});

export const ragRuns = mysqlTable("rag_runs", {
  id: varchar("id", { length: 191 }).primaryKey(),
  question: text("question").notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
  reliability: decimal("reliability", { precision: 5, scale: 4 }).notNull(),
  abstained: tinyint("abstained").notNull(),
  hallucinationRate: decimal("hallucination_rate", { precision: 5, scale: 4 }).notNull(),
  corrections: int("corrections", { unsigned: true }).notNull(),
});

export const ragSettings = mysqlTable("rag_settings", {
  id: tinyint("id", { unsigned: true }).primaryKey(),
  settingsJson: json("settings_json").$type<Record<string, unknown>>().notNull(),
});
