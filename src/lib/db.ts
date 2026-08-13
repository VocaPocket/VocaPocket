import { Pool } from "pg";

// Railway injects DATABASE_URL automatically once a Postgres plugin is
// attached to this service. Locally (no DATABASE_URL) the app falls back to
// file storage in store.ts — nothing else needs to branch on this.
export const hasDb = !!process.env.DATABASE_URL;

let pool: Pool | null = null;
export function db(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

let initialized = false;
export async function ensureSchema() {
  if (!hasDb || initialized) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'word',
      source TEXT NOT NULL DEFAULT 'en',
      target TEXT NOT NULL DEFAULT 'zh-TW',
      created_at BIGINT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'search',
      introduced_day TEXT,
      phonetic TEXT,
      kk TEXT,
      audio TEXT,
      pos TEXT,
      example TEXT,
      example_zh TEXT,
      reps INT NOT NULL DEFAULT 0,
      interval DOUBLE PRECISION NOT NULL DEFAULT 0,
      ease DOUBLE PRECISION NOT NULL DEFAULT 2.5,
      due_at BIGINT,
      review_count INT NOT NULL DEFAULT 0,
      correct_count INT NOT NULL DEFAULT 0,
      mastered BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS app_state (
      id INT PRIMARY KEY DEFAULT 1,
      daily_new_count INT NOT NULL DEFAULT 3,
      last_intro_day TEXT NOT NULL DEFAULT '',
      streak INT NOT NULL DEFAULT 0,
      longest INT NOT NULL DEFAULT 0,
      total_xp INT NOT NULL DEFAULT 0,
      today_key TEXT NOT NULL DEFAULT '',
      today_xp INT NOT NULL DEFAULT 0,
      last_study_day TEXT NOT NULL DEFAULT '',
      days JSONB NOT NULL DEFAULT '{}'::jsonb,
      pet_species_idx INT NOT NULL DEFAULT 0,
      pet_xp INT NOT NULL DEFAULT 0,
      collection JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    INSERT INTO app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    ALTER TABLE app_state ADD COLUMN IF NOT EXISTS pet_species_idx INT NOT NULL DEFAULT 0;
    ALTER TABLE app_state ADD COLUMN IF NOT EXISTS pet_xp INT NOT NULL DEFAULT 0;
    ALTER TABLE app_state ADD COLUMN IF NOT EXISTS collection JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE words ADD COLUMN IF NOT EXISTS kk TEXT;
  `);
  initialized = true;
}
