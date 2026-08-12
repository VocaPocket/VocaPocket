"use client";

import { useMemo, useState } from "react";
import type { Word } from "@/lib/types";
import { shuffle } from "@/lib/utils";

const SIZE = 10;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Placement = { id: string; text: string; translation: string; cells: [number, number][] };

function buildPuzzle(pool: Word[]) {
  const candidates = shuffle(pool).slice(0, 8);
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  const placements: Placement[] = [];

  for (const w of candidates) {
    const text = w.text.toUpperCase();
    if (placements.some((p) => p.text === text)) continue;
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      let r: number, c: number, cells: [number, number][];
      if (horizontal) {
        const maxCol = SIZE - text.length;
        if (maxCol < 0) continue;
        r = Math.floor(Math.random() * SIZE);
        c = Math.floor(Math.random() * (maxCol + 1));
        cells = Array.from({ length: text.length }, (_, i) => [r, c + i] as [number, number]);
      } else {
        const maxRow = SIZE - text.length;
        if (maxRow < 0) continue;
        c = Math.floor(Math.random() * SIZE);
        r = Math.floor(Math.random() * (maxRow + 1));
        cells = Array.from({ length: text.length }, (_, i) => [r + i, c] as [number, number]);
      }
      const conflict = cells.some(([rr, cc], i) => grid[rr][cc] && grid[rr][cc] !== text[i]);
      if (!conflict) {
        cells.forEach(([rr, cc], i) => { grid[rr][cc] = text[i]; });
        placements.push({ id: w.id, text, translation: w.translation, cells });
        placed = true;
      }
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
  }
  return { grid, placements };
}

export default function WordSearchGame({
  words,
  onReview,
  onClose,
}: {
  words: Word[];
  onReview: (id: string, correct: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const pool = useMemo(
    () => words.filter((w) => w.type === "word" && /^[A-Za-z]+$/.test(w.text) && w.text.length >= 3 && w.text.length <= SIZE),
    [words],
  );
  const [puzzle] = useState(() => (pool.length >= 3 ? buildPuzzle(pool) : null));
  const [found, setFound] = useState<Set<string>>(new Set());
  const [firstCell, setFirstCell] = useState<[number, number] | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);

  if (!puzzle || puzzle.placements.length < 3) {
    return (
      <Shell onClose={onClose}>
        <div className="flex flex-1 items-center justify-center text-center text-white/60">再收集幾個 3-10 字母的英文單字，才能玩找字遊戲</div>
      </Shell>
    );
  }

  const foundCellSet = new Set<string>();
  puzzle.placements.forEach((p) => {
    if (found.has(p.id)) p.cells.forEach(([r, c]) => foundCellSet.add(`${r},${c}`));
  });

  function cellsInLine(a: [number, number], b: [number, number]): [number, number][] | null {
    const [r1, c1] = a, [r2, c2] = b;
    if (r1 === r2) {
      const [lo, hi] = c1 < c2 ? [c1, c2] : [c2, c1];
      return Array.from({ length: hi - lo + 1 }, (_, i) => [r1, lo + i] as [number, number]);
    }
    if (c1 === c2) {
      const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
      return Array.from({ length: hi - lo + 1 }, (_, i) => [lo + i, c1] as [number, number]);
    }
    return null;
  }

  function onCellClick(r: number, c: number) {
    if (!firstCell) { setFirstCell([r, c]); return; }
    const line = cellsInLine(firstCell, [r, c]);
    setFirstCell(null);
    if (!line) return;
    const str = line.map(([rr, cc]) => puzzle!.grid[rr][cc]).join("");
    const rev = str.split("").reverse().join("");
    const hit = puzzle!.placements.find((p) => !found.has(p.id) && (p.text === str || p.text === rev));
    if (hit) {
      const next = new Set(found);
      next.add(hit.id);
      setFound(next);
      onReview(hit.id, true);
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 300);
    }
  }

  const allFound = found.size === puzzle.placements.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col p-5" style={{ background: "radial-gradient(120% 120% at 50% 0%,#1e1b4b,#0f0f1e)" }}>
      <div className="mx-auto flex w-full max-w-md items-center gap-3 pt-2 text-white">
        <button onClick={onClose} className="text-2xl text-white/60">✕</button>
        <p className="flex-1 text-center text-sm font-semibold">找字遊戲 · 已找到 {found.size}/{puzzle.placements.length}</p>
        <span className="w-6" />
      </div>

      {allFound ? (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center text-white">
          <div className="text-6xl">🌟</div>
          <p className="mt-3 text-2xl font-extrabold">全部找到了！</p>
          <p className="mt-1 text-white/60">{puzzle.placements.length} 個單字通通收集</p>
          <button onClick={onClose} className="mt-6 rounded-2xl px-8 py-3 font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>完成</button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center pt-4">
          <div className={`grid gap-[3px] rounded-2xl bg-white/10 p-2 ${wrongFlash ? "animate-pulse" : ""}`} style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))` }}>
            {puzzle.grid.map((row, r) =>
              row.map((letter, c) => {
                const key = `${r},${c}`;
                const isFound = foundCellSet.has(key);
                const isFirst = firstCell && firstCell[0] === r && firstCell[1] === c;
                return (
                  <button
                    key={key}
                    onClick={() => onCellClick(r, c)}
                    className="flex aspect-square w-full items-center justify-center rounded text-[11px] font-bold sm:text-xs"
                    style={{
                      background: isFound ? "rgba(52,211,153,.85)" : isFirst ? "rgba(124,108,240,.9)" : "rgba(255,255,255,.92)",
                      color: isFound || isFirst ? "#fff" : "#1e1b4b",
                    }}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {puzzle.placements.map((p) => (
              <span
                key={p.id}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${found.has(p.id) ? "bg-green-500/25 text-green-300 line-through" : "bg-white/10 text-white/70"}`}
              >
                {p.translation}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-white/40">點第一個字母，再點最後一個字母（橫或直）連成單字</p>
        </div>
      )}
    </div>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col p-5" style={{ background: "radial-gradient(120% 120% at 50% 0%,#1e1b4b,#0f0f1e)" }}>
      <div className="mx-auto flex w-full max-w-md items-center gap-3 pt-2 text-white">
        <button onClick={onClose} className="text-2xl text-white/60">✕</button>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
    </div>
  );
}
