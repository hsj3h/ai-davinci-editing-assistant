
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const databaseDir = path.resolve(currentDir, "../../data");
fs.mkdirSync(databaseDir, { recursive: true });

const databasePath = path.join(databaseDir, "assistant.db");

export const db: Database.Database = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    project TEXT NOT NULL,
    timeline TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL,
    plan_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    capability TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    task_json TEXT NOT NULL,
    PRIMARY KEY (id, plan_id),
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    approved INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS execution_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );
`);

console.log(`SQLite database initialized: ${databasePath}`);
