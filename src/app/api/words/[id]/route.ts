import { NextRequest, NextResponse } from "next/server";
import { loadWords, saveWords } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const items = await loadWords();
  const next = items.filter((w) => w.id !== id);
  await saveWords(next);
  return NextResponse.json({ deleted: items.length - next.length });
}
