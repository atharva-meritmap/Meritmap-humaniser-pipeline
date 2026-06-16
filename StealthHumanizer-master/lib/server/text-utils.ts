const WORD_REGEX = /\p{L}+(?:['’\-]\p{L}+)?/gu;

export function tokenizeWords(text: string): string[] {
  const matches = (text || '').match(WORD_REGEX) || [];
  return matches.map((token) => token.toLocaleLowerCase('en'));
}

export function splitSentencesLinear(text: string): string[] {
  const value = (text || '').trim();
  if (!value) return [];
  const output: string[] = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = value[i + 1];
      if (!next || /\s|["')\]]/.test(next)) {
        const sentence = value.slice(start, i + 1).trim();
        if (sentence) output.push(sentence);
        start = i + 1;
      }
    }
  }
  const tail = value.slice(start).trim();
  if (tail) output.push(tail);
  return output;
}
