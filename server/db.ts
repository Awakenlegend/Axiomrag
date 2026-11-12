import { readFile } from "node:fs/promises";
import path from "node:path";
import { createPool, type Pool } from "mysql2/promise";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not available for this project.");
  pool = createPool(databaseUrl);
  return pool;
}

export async function queryRows<T extends object = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, values as never[]);
  return rows as T[];
}

export async function runMigrations(): Promise<void> {
  const db = getPool();
  await db.query(`CREATE TABLE IF NOT EXISTS app_migrations (
    id VARCHAR(120) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  )`);

  const migrationId = "0001_rag_tables";
  const alreadyApplied = await queryRows<{ id: string }>(
    "SELECT id FROM app_migrations WHERE id = ?",
    [migrationId],
  );
  if (alreadyApplied.length) return;

  const migrationPath = path.join(process.cwd(), "drizzle", `${migrationId}.sql`);
  const source = await readFile(migrationPath, "utf8");
  const statements = source
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean);

  const connection = await db.getConnection();
  try {
    for (const statement of statements) await connection.query(statement);
    await connection.execute("INSERT IGNORE INTO app_migrations (id) VALUES (?)", [migrationId]);
  } finally {
    connection.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}
