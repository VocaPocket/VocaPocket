// Converts the American-leaning IPA returned by dictionary APIs into KK
// phonetic notation (the American-pronunciation system taught in Taiwan).
// KK and IPA describe the same phonemes with mostly the same symbols — the
// differences are a handful of diphthongs/vowels and the rhotic "r". This is
// a best-effort mechanical conversion, not a verified KK dictionary lookup:
// it's usually right, but the source IPA occasionally leans British (e.g.
// non-rhotic "-er"), which this conversion approximates toward American KK.
export function ipaToKK(ipa: string): string {
  let s = ipa.trim();
  s = s.replace(/^[/[]|[/\]]$/g, ""); // strip surrounding / / or [ ]
  s = s.replace(/\./g, ""); // drop syllable-separator dots

  // Diphthongs / long vowels — longest patterns first so they win over
  // any single-character rule below.
  const vowelRules: [RegExp, string][] = [
    [/eɪ/g, "e"],
    [/oʊ/g, "o"],
    [/əʊ/g, "o"], // British "go" diphthong -> American KK o
    [/ɜːr/g, "ɝ"],
    [/ɜː/g, "ɝ"], // British non-rhotic stressed er -> American ɝ
    [/ɜ/g, "ɝ"],
    [/ɑː/g, "ɑ"],
    [/ɒ/g, "ɑ"], // British short o ("hot") -> American ɑ
    [/ɔː/g, "ɔ"],
    [/iː/g, "i"],
    [/uː/g, "u"],
  ];
  for (const [re, rep] of vowelRules) s = s.replace(re, rep);

  s = s.replace(/ɹ/g, "r"); // some sources use ɹ for the American r
  s = s.replace(/ː/g, ""); // any leftover length marks

  return s.trim();
}
