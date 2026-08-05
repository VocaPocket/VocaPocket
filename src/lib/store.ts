import { promises as fs } from "fs";
import path from "path";

// Simple file-based store for the prototype. Swap for a database (Postgres/D1)
// when we move to multi-user + production persistence.
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "vocabulary.json");

export type Word = {
  id: string;
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  createdAt: number;
  reviewCount: number;
  mastered: boolean;
};

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, JSON.stringify({ items: [] }, null, 2));
  }
}

export async function loadWords(): Promise<Word[]> {
  await ensure();
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw).items || [];
  } catch {
    return [];
  }
}

export async function saveWords(items: Word[]) {
  await ensure();
  await fs.writeFile(FILE, JSON.stringify({ items }, null, 2));
}
