// Shared, client-safe type. No server imports (fs/pg) — importable from
// both API routes and "use client" components.
export type Word = {
  id: string;
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  createdAt: number;
  origin: "search" | "daily";
  introducedDay?: string;
  phonetic?: string;
  audio?: string;
  pos?: string;
  example?: string;
  exampleZh?: string;
  reps: number;
  interval: number;
  ease: number;
  dueAt: number | null;
  reviewCount: number;
  correctCount: number;
  mastered: boolean;
};
