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
