import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

type MigrationRow = {
  id: number;
  name: string;
  applied_at: string;
};

const migrationsDir = join(import.meta.dir, "../migrations");

const dbPath = join(import.meta.dir, "../../database/orders.db");

function ensureTable(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

function listMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function getApplied(db: Database): MigrationRow[] {
  const rows = db
    .query("SELECT id, name, applied_at FROM __migrations ORDER BY id ASC")
    .all() as MigrationRow[];
  return rows;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyOne(db: Database, filename: string) {
  const fullPath = join(migrationsDir, filename);
  const sql = readFileSync(fullPath, "utf8");
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    db.run(stmt);
  }
  db.run("INSERT INTO __migrations (name, applied_at) VALUES (?, datetime())", [
    filename,
  ]);
}

function main() {
  const db = new Database(dbPath, { create: true });
  ensureTable(db);

  const files = listMigrationFiles();
  const applied = getApplied(db);

  const appliedNames = new Set(applied.map((row) => row.name));
  const pending = files.filter((file) => !appliedNames.has(file));

  if (pending.length === 0) {
    console.log("No migrations to run.");
    db.close();
    return;
  }

  console.log(`Running ${pending.length} migration(s)...`);

  db.run("BEGIN");

  try {
    for (const f of pending) {
      console.log(`→ ${f}`);
      applyOne(db, f);
    }

    db.run("COMMIT");
    console.log("Done.");
  } catch (err) {
    db.run("ROLLBACK");
    console.error("Migration failed:", err);
    db.close();
    process.exit(1);
  }

  db.close();
}

main();

