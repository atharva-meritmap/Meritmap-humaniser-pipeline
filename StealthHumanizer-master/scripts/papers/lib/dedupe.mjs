function normalize(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDoi(doi) {
  return normalize(doi).replace(/^https?\s*doi\s*org\s*/i, "").replace(/\s+/g, "");
}

function identityKey(record) {
  const doi = normalizeDoi(record.doi);
  if (doi) return `doi:${doi}`;

  const title = normalize(record.title);
  const year = record.publicationYear || "unknown";
  const author = normalize(record.firstAuthor);
  return `fallback:${title}|${author}|${year}`;
}

export function deduplicateRecords(records) {
  const seen = new Set();
  const unique = [];
  const duplicateCountByKey = {};

  for (const record of records) {
    const key = identityKey(record);
    if (seen.has(key)) {
      duplicateCountByKey[key] = (duplicateCountByKey[key] || 0) + 1;
      continue;
    }
    seen.add(key);
    unique.push(record);
  }

  return {
    unique,
    duplicateCount: records.length - unique.length,
    duplicateCountByKey,
  };
}
