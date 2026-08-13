import { promises as fs } from "fs";
import path from "path";
import { db, hasDb, ensureSchema } from "@/lib/db";
import { feedPet } from "@/lib/pets";
import type { Word } from "@/lib/types";

export type { Word };

// Postgres when DATABASE_URL is set (Railway production), otherwise a local
// JSON file (dev without a DB attached). Every function below picks one path;
// callers never need to know which.
const DATA_DIR = path.join(process.cwd(), "data");
const WORDS_FILE = path.join(DATA_DIR, "vocabulary.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export type State = {
  dailyNewCount: number;
  lastIntroDay: string;
  streak: number;
  longest: number;
  totalXp: number;
  todayKey: string;
  todayXp: number;
  lastStudyDay: string;
  days: Record<string, { xp: number }>;
  petSpeciesIdx: number;
  petXp: number;
  collection: Record<string, number>;
};

const DEFAULT_STATE: State = {
  dailyNewCount: 3,
  lastIntroDay: "",
  streak: 0,
  longest: 0,
  totalXp: 0,
  todayKey: "",
  todayXp: 0,
  lastStudyDay: "",
  days: {},
  petSpeciesIdx: 0,
  petXp: 0,
  collection: {},
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function dayKey(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function rowToWord(r: Record<string, unknown>): Word {
  return {
    id: r.id as string,
    text: r.text as string,
    translation: r.translation as string,
    type: r.type as string,
    source: r.source as string,
    target: r.target as string,
    createdAt: Number(r.created_at),
    origin: r.origin as "search" | "daily",
    introducedDay: (r.introduced_day as string) || undefined,
    phonetic: (r.phonetic as string) || undefined,
    kk: (r.kk as string) || undefined,
    audio: (r.audio as string) || undefined,
    pos: (r.pos as string) || undefined,
    example: (r.example as string) || undefined,
    exampleZh: (r.example_zh as string) || undefined,
    reps: Number(r.reps),
    interval: Number(r.interval),
    ease: Number(r.ease),
    dueAt: r.due_at == null ? null : Number(r.due_at),
    reviewCount: Number(r.review_count),
    correctCount: Number(r.correct_count),
    mastered: !!r.mastered,
  };
}

export async function loadWords(): Promise<Word[]> {
  if (hasDb) {
    await ensureSchema();
    const { rows } = await db().query("SELECT * FROM words ORDER BY created_at DESC");
    return rows.map(rowToWord);
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(WORDS_FILE, "utf-8");
    return JSON.parse(raw).items || [];
  } catch {
    return [];
  }
}

export async function saveWords(items: Word[]) {
  if (hasDb) {
    await ensureSchema();
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM words");
      for (const w of items) {
        await client.query(
          `INSERT INTO words (id, text, translation, type, source, target, created_at, origin,
             introduced_day, phonetic, kk, audio, pos, example, example_zh,
             reps, interval, ease, due_at, review_count, correct_count, mastered)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
          [
            w.id, w.text, w.translation, w.type, w.source, w.target, w.createdAt, w.origin,
            w.introducedDay ?? null, w.phonetic ?? null, w.kk ?? null, w.audio ?? null, w.pos ?? null,
            w.example ?? null, w.exampleZh ?? null,
            w.reps, w.interval, w.ease, w.dueAt, w.reviewCount, w.correctCount, w.mastered,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return;
  }
  await ensureDir();
  await fs.writeFile(WORDS_FILE, JSON.stringify({ items }, null, 2));
}

function rowToState(r: Record<string, unknown>): State {
  return {
    dailyNewCount: Number(r.daily_new_count),
    lastIntroDay: r.last_intro_day as string,
    streak: Number(r.streak),
    longest: Number(r.longest),
    totalXp: Number(r.total_xp),
    todayKey: r.today_key as string,
    todayXp: Number(r.today_xp),
    lastStudyDay: r.last_study_day as string,
    days: (r.days as Record<string, { xp: number }>) || {},
    petSpeciesIdx: Number(r.pet_species_idx ?? 0),
    petXp: Number(r.pet_xp ?? 0),
    collection: (r.collection as Record<string, number>) || {},
  };
}

export async function loadState(): Promise<State> {
  if (hasDb) {
    await ensureSchema();
    const { rows } = await db().query("SELECT * FROM app_state WHERE id = 1");
    return rows[0] ? rowToState(rows[0]) : { ...DEFAULT_STATE };
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state: State) {
  if (hasDb) {
    await ensureSchema();
    await db().query(
      `UPDATE app_state SET daily_new_count=$1, last_intro_day=$2, streak=$3, longest=$4,
         total_xp=$5, today_key=$6, today_xp=$7, last_study_day=$8, days=$9,
         pet_species_idx=$10, pet_xp=$11, collection=$12 WHERE id = 1`,
      [
        state.dailyNewCount, state.lastIntroDay, state.streak, state.longest,
        state.totalXp, state.todayKey, state.todayXp, state.lastStudyDay,
        JSON.stringify(state.days),
        state.petSpeciesIdx, state.petXp, JSON.stringify(state.collection),
      ],
    );
    return;
  }
  await ensureDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

// Mastery derived from accuracy: high accuracy over enough reviews = learned.
export function accuracy(w: Word): number {
  return w.reviewCount ? w.correctCount / w.reviewCount : 0;
}
export function isMastered(w: Word): boolean {
  return w.reviewCount >= 3 && accuracy(w) >= 0.8;
}

// SM-2-style scheduling. Mastered words still come back, just far apart.
export function advanceSrs(w: Word, correct: boolean) {
  let ease = w.ease || 2.5;
  let reps = w.reps || 0;
  let interval = w.interval || 0;
  if (correct) {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(1, interval * ease);
    ease = Math.min(2.7, ease + 0.1);
  } else {
    reps = 0;
    interval = 0.5;
    ease = Math.max(1.3, ease - 0.2);
  }
  return { reps, interval, ease, dueAt: Date.now() + interval * 86_400_000 };
}

// New-word defaults applied to both searched and daily words.
export function baseSrsFields(): Pick<
  Word,
  "reps" | "interval" | "ease" | "dueAt" | "reviewCount" | "correctCount" | "mastered"
> {
  return { reps: 0, interval: 0, ease: 2.5, dueAt: Date.now(), reviewCount: 0, correctCount: 0, mastered: false };
}

export function awardXp(state: State, amount: number): State {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  if (state.todayKey !== today) {
    state.todayKey = today;
    state.todayXp = 0;
  }
  state.todayXp += amount;
  state.totalXp += amount;
  state.days[today] = { xp: (state.days[today]?.xp || 0) + amount };
  if (state.lastStudyDay !== today) {
    state.streak = state.lastStudyDay === yesterday ? state.streak + 1 : 1;
    state.lastStudyDay = today;
    state.longest = Math.max(state.longest, state.streak);
  }
  const fed = feedPet(state.petSpeciesIdx, state.petXp, state.collection, amount);
  state.petSpeciesIdx = fed.speciesIdx;
  state.petXp = fed.petXp;
  state.collection = fed.collection;
  return state;
}
