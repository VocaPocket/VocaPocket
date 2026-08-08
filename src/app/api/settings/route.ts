import { NextRequest, NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";

export async function GET() {
  const s = await loadState();
  return NextResponse.json({ dailyNewCount: s.dailyNewCount });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const state = await loadState();
  if (b.dailyNewCount != null) {
    state.dailyNewCount = Math.max(1, Math.min(10, Number(b.dailyNewCount)));
    // let today's set re-introduce with the new count
    state.lastIntroDay = "";
  }
  await saveState(state);
  return NextResponse.json({ dailyNewCount: state.dailyNewCount });
}
