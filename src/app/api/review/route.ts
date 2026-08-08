import { NextRequest, NextResponse } from "next/server";
import {
  loadWords,
  saveWords,
  loadState,
  saveState,
  advanceSrs,
  isMastered,
  awardXp,
} from "@/lib/store";

// Record one review outcome for a word. Updates spaced-repetition schedule,
// re-derives mastery from accuracy, and awards XP / streak.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const id = b.id;
  const correct = !!b.correct;

  const words = await loadWords();
  const w = words.find((x) => x.id === id);
  if (!w) return NextResponse.json({ error: "not_found" }, { status: 404 });

  w.reviewCount = (w.reviewCount || 0) + 1;
  if (correct) w.correctCount = (w.correctCount || 0) + 1;
  const s = advanceSrs(w, correct);
  w.reps = s.reps;
  w.interval = s.interval;
  w.ease = s.ease;
  w.dueAt = s.dueAt;
  w.mastered = isMastered(w);
  await saveWords(words);

  let state = await loadState();
  state = awardXp(state, correct ? 10 : 4);
  await saveState(state);

  return NextResponse.json({
    word: { id: w.id, mastered: w.mastered, reviewCount: w.reviewCount },
    streak: state.streak,
    todayXp: state.todayXp,
    totalXp: state.totalXp,
  });
}
