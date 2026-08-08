import { NextRequest, NextResponse } from "next/server";
import { detectSource, detectType, mymemory, enrichEnglish } from "@/lib/translate";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const source = detectSource(text);
  let target = body.target || (source === "en" ? "zh-TW" : "en");
  if (source === target) target = source === "en" ? "zh-TW" : "en";
  const type = detectType(text);

  try {
    const translation = await mymemory(text, source, target);

    // Enrich single English words with IPA, audio, part of speech, example.
    let extra: {
      phonetic?: string;
      audio?: string;
      pos?: string;
      example?: string;
      exampleZh?: string;
    } = {};
    if (source === "en" && type === "word") {
      const e = await enrichEnglish(text);
      extra = { phonetic: e.phonetic, audio: e.audio, pos: e.pos, example: e.example };
      if (e.example) {
        try {
          extra.exampleZh = await mymemory(e.example, "en", "zh-TW");
        } catch {}
      }
    }

    return NextResponse.json({ text, translation, type, source, target, ...extra });
  } catch {
    return NextResponse.json(
      { error: "translation_failed", message: "翻譯服務暫時無法使用，請稍後再試。" },
      { status: 502 },
    );
  }
}
