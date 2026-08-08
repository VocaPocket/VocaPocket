// Language + type detection and free translation via the MyMemory API.

export function detectSource(text: string): string {
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[가-힯]/.test(text)) return "ko";
  if (/[一-鿿]/.test(text)) return "zh-TW";
  return "en";
}

export function detectType(text: string): "word" | "phrase" | "sentence" {
  const t = text.trim();
  const words = t.split(/\s+/);
  if (words.length >= 6 || /[.?!。？！]$/.test(t)) return "sentence";
  if (words.length >= 2) return "phrase";
  return "word";
}

const POS_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代名詞",
  preposition: "介系詞",
  conjunction: "連接詞",
  interjection: "感嘆詞",
  determiner: "限定詞",
};

export type Enrichment = { phonetic?: string; audio?: string; pos?: string; example?: string };

// Free Dictionary API — adds IPA, audio, part of speech and an example for
// English words. Best-effort: returns {} on any failure.
export async function enrichEnglish(word: string): Promise<Enrichment> {
  try {
    const res = await fetch(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word),
    );
    if (!res.ok) return {};
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) return {};

    let phonetic: string | undefined = entry.phonetic;
    let audio = "";
    for (const p of entry.phonetics || []) {
      if (!phonetic && p.text) phonetic = p.text;
      if (!audio && p.audio) audio = p.audio;
    }
    const pos = entry.meanings?.[0]?.partOfSpeech;
    let example = "";
    for (const m of entry.meanings || []) {
      for (const d of m.definitions || []) {
        if (d.example) { example = d.example; break; }
      }
      if (example) break;
    }
    return {
      phonetic: phonetic || undefined,
      audio: audio || undefined,
      pos: pos ? POS_ZH[pos] || pos : undefined,
      example: example || undefined,
    };
  } catch {
    return {};
  }
}

export async function mymemory(
  text: string,
  source: string,
  target: string,
): Promise<string> {
  const url =
    "https://api.mymemory.translated.net/get?" +
    new URLSearchParams({ q: text, langpair: `${source}|${target}` });
  const res = await fetch(url, { headers: { "User-Agent": "VocaPocket/1.0" } });
  if (!res.ok) throw new Error("translation service error");
  const data = await res.json();
  const t = data?.responseData?.translatedText || "";
  if (!t) throw new Error("empty translation");
  return t;
}
