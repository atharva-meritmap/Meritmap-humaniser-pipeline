const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "fig",
  "eq",
  "al",
  "etc",
  "e.g",
  "i.e",
  "vs",
  "no",
  "st",
  "jr",
  "sr",
]);

function looksLikeSentenceBoundary(text, index) {
  const prefix = text.slice(Math.max(0, index - 12), index + 1).toLowerCase();
  const tokens = prefix.split(/[\s\(\)\[\]"]+/).filter(Boolean);
  const last = tokens[tokens.length - 1] || "";
  const normalized = last.replace(/[.!?]+$/, "");
  return !ABBREVIATIONS.has(normalized);
}

export function splitParagraphs(text) {
  return (text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function splitSentences(text) {
  const value = (text || "").trim();
  if (!value) return [];

  const sentences = [];
  let start = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if ((ch === "." || ch === "!" || ch === "?") && looksLikeSentenceBoundary(value, i)) {
      const next = value[i + 1];
      if (!next || /\s|["')\]]/.test(next)) {
        const part = value.slice(start, i + 1).trim();
        if (part) sentences.push(part);
        start = i + 1;
      }
    }
  }

  const tail = value.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
