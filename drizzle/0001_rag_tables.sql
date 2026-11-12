CREATE TABLE IF NOT EXISTS rag_documents (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  chunk_count INT UNSIGNED NOT NULL,
  added_at DATETIME(3) NOT NULL,
  KEY rag_documents_name_idx (name),
  KEY rag_documents_added_idx (added_at)
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  document_id VARCHAR(191) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  chunk_index INT UNSIGNED NOT NULL,
  chunk_text LONGTEXT NOT NULL,
  terms JSON NOT NULL,
  KEY rag_chunks_document_idx (document_id),
  CONSTRAINT rag_chunks_document_fk FOREIGN KEY (document_id)
    REFERENCES rag_documents (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rag_runs (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  question TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  reliability DECIMAL(5, 4) NOT NULL,
  abstained TINYINT(1) NOT NULL,
  hallucination_rate DECIMAL(5, 4) NOT NULL,
  corrections INT UNSIGNED NOT NULL,
  KEY rag_runs_created_idx (created_at)
);

CREATE TABLE IF NOT EXISTS rag_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  settings_json JSON NOT NULL
);
