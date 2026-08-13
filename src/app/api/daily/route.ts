import { NextResponse } from "next/server";
import {
  loadWords,
  saveWords,
  loadState,
  saveState,
  dayKey,
  baseSrsFields,
  isMastered,
  Word,
} from "@/lib/store";
import { WORDBANK } from "@/lib/wordbank";
import { enrichEnglish } from "@/lib/translate";

// GET today's learning set: newly-introduced daily words + everything due for
// review (recently-searched words AND daily words), plus mastery stats.
export async function GET() {
  const state = await loadState();
  const words = await loadWords();
  const today = dayKey();

  // Introduce today's batch of new daily words (once per day).
  if (state.lastIntroDay !== today) {
    const known = new Set(words.map((w) => w.text.toLowerCase()));
    const toAdd = [];
    for (const bw of WORDBANK) {
      if (toAdd.length >= state.dailyNewCount) break;
      if (known.has(bw.word.toLowerCase())) continue;
      toAdd.push(bw);
    }
    // Fetch phonetic/KK/audio for the new batch (curated pos/example from
    // the wordbank are kept as-is; only pronunciation data comes from the API).
    const enriched = await Promise.all(toAdd.map((bw) => enrichEnglish(bw.word)));
    toAdd.forEach((bw, i) => {
      const e = enriched[i];
      words.push({
        id: crypto.randomUUID(),
        text: bw.word,
        translation: bw.zh,
        type: "word",
        source: "en",
        target: "zh-TW",
        createdAt: Date.now(),
        origin: "daily",
        introducedDay: today,
        pos: bw.pos,
        example: bw.example,
        exampleZh: bw.exampleZh,
        phonetic: e.phonetic,
        kk: e.kk,
        audio: e.audio,
        ...baseSrsFields(),
      } as Word);
    });
    state.lastIntroDay = today;
    await saveWords(words);
    await saveState(state);
  }

  const now = Date.now();
  const newToday = words.filter(
    (w) => w.origin === "daily" && w.introducedDay === today,
  );
  const newIds = new Set(newToday.map((w) => w.id));
  const review = words
    .filter((w) => !newIds.has(w.id) && (w.dueAt == null || w.dueAt <= now))
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  const mastered = words.filter((w) => isMastered(w)).length;
  const learning = words.length - mastered;

  return NextResponse.json({
    dailyNewCount: state.dailyNewCount,
    streak: state.streak,
    todayXp: state.todayXp,
    totalXp: state.totalXp,
    counts: { new: newToday.length, review: review.length, mastered, learning, total: words.length },
    newToday,
    review,
  });
}
