// Practice-progress pet system: every bit of XP you earn (review, quiz,
// daily lesson) also feeds your current pet. It grows through 4 stages and,
// once fully grown, joins your permanent collection — then a new egg starts.

export type PetSpecies = { id: string; name: string; emojis: [string, string, string, string] };

export const PET_SPECIES: PetSpecies[] = [
  { id: "dragon", name: "小龍", emojis: ["🥚", "🐣", "🐲", "🐉"] },
  { id: "cat", name: "貓咪", emojis: ["🥚", "🐱", "🐈", "🦁"] },
  { id: "dog", name: "狗狗", emojis: ["🥚", "🐶", "🐕", "🐺"] },
  { id: "bird", name: "鳥鳥", emojis: ["🥚", "🐤", "🐦", "🦅"] },
  { id: "fish", name: "魚魚", emojis: ["🥚", "🐟", "🐠", "🐬"] },
  { id: "bug", name: "夢幻蟲", emojis: ["🥚", "🐛", "🦋", "🦄"] },
  { id: "dino", name: "恐龍", emojis: ["🥚", "🦎", "🐊", "🦖"] },
  { id: "panda", name: "熊貓", emojis: ["🥚", "🐼", "🐨", "🐻"] },
];

// Cumulative XP thresholds for [蛋, 幼體, 成長期, 完全體]. Reaching the last
// value completes the pet; the remainder carries over to the next egg.
export const STAGE_XP = [0, 30, 80, 160];
export const STAGE_LABELS = ["蛋", "幼體", "成長期", "完全體"];
export const COMPLETE_XP = STAGE_XP[STAGE_XP.length - 1];

export function petStage(xp: number): number {
  let stage = 0;
  for (let i = STAGE_XP.length - 1; i >= 0; i--) {
    if (xp >= STAGE_XP[i]) { stage = i; break; }
  }
  return Math.min(stage, STAGE_LABELS.length - 1);
}

export function petProgress(xp: number) {
  const stage = petStage(xp);
  const isMax = xp >= COMPLETE_XP;
  const floor = STAGE_XP[stage];
  const ceil = isMax ? COMPLETE_XP : STAGE_XP[stage + 1];
  const pct = isMax ? 100 : Math.round(((xp - floor) / (ceil - floor)) * 100);
  return { stage, isMax, pct, ceil };
}

// Feeds xp into the current pet; if it completes, banks it into the
// collection and rolls the remainder into a freshly started next species.
export function feedPet(
  speciesIdx: number,
  petXp: number,
  collection: Record<string, number>,
  amount: number,
): { speciesIdx: number; petXp: number; collection: Record<string, number>; justCompleted: boolean } {
  let xp = petXp + amount;
  let idx = speciesIdx;
  const col = { ...collection };
  let justCompleted = false;
  while (xp >= COMPLETE_XP) {
    const species = PET_SPECIES[idx % PET_SPECIES.length];
    col[species.id] = (col[species.id] || 0) + 1;
    xp -= COMPLETE_XP;
    idx = (idx + 1) % PET_SPECIES.length;
    justCompleted = true;
  }
  return { speciesIdx: idx, petXp: xp, collection: col, justCompleted };
}
