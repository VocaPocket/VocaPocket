import { NextResponse } from "next/server";
import { loadState } from "@/lib/store";
import { PET_SPECIES, STAGE_LABELS, petProgress } from "@/lib/pets";

export async function GET() {
  const s = await loadState();
  const species = PET_SPECIES[s.petSpeciesIdx % PET_SPECIES.length];
  const { stage, pct } = petProgress(s.petXp);
  return NextResponse.json({
    current: {
      speciesId: species.id,
      name: species.name,
      emoji: species.emojis[stage],
      stage,
      stageLabel: STAGE_LABELS[stage],
      xp: s.petXp,
      pct,
    },
    species: PET_SPECIES.map((sp) => ({ id: sp.id, name: sp.name, emoji: sp.emojis[3] })),
    collection: s.collection,
  });
}
