import { promises as fs } from "fs";
import path from "path";

// File-based store for the prototype. Swap for a database (Postgres/D1)
// when we move to multi-user + production persistence.
const DATA_DIR = path.join(process.cwd(), "data");
const WORDS_FILE = path.join(DATA_DIR, "vocabulary.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export type Word = {
  id: string;
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  createdAt: number;
  // where it came from: user search vs pushed daily word
  origin: "search" | "daily";
  introducedDay?: string; // yyyy-mm-dd for daily words
  // richer content
  phonetic?: string;
  audio?: string;
  pos?: string;
  example?: string;
  exampleZh?: string;
  // spaced repetition + mastery
  reps: number;
  interval: number; // days
  ease: number;
  dueAt: number | null;
  reviewCount: number;
  correctCount: number;
  mastered: boolean;
};

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
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function dayKey(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export async function loadWords(): Promise<Word[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(WORDS_FILE, "utf-8");
    return JSON.parse(raw).items || [];
  } catch {
    return [];
  }
}

export async function saveWords(items: Word[]) {
  await ensureDir();
  await fs.writeFile(WORDS_FILE, JSON.stringify({ items }, null, 2));
}

export async function loadState(): Promise<State> {
  await ensureDir();
  try {
    const raw = await fs.readFile(STATE_FILE, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state: State) {
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
  return state;
}
