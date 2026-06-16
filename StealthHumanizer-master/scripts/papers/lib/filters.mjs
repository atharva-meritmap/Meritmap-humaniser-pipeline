const DEFAULT_LICENSE_ALLOWLIST = [
  "cc-by",
  "cc-by-sa",
  "cc0",
  "cc-by-nc",
  "cc-by-nc-sa",
  "cc-by-nd",
  "cc-by-nc-nd",
];

function normalized(value) {
  return (value || "").toString().trim().toLowerCase();
}

function inferEnglishFromText(title, abstractText) {
  const sample = `${title || ""} ${abstractText || ""}`.trim();
  if (!sample) return false;
  const asciiLetters = (sample.match(/[a-z]/gi) || []).length;
  const nonAscii = (sample.match(/[^\x00-\x7F]/g) || []).length;
  if (asciiLetters < 50) return false;
  return nonAscii / Math.max(sample.length, 1) < 0.08;
}

export function evaluateRecord(record, config) {
  const languageAllowlist = (config.languageAllowlist || ["en"]).map(normalized);
  const licenseAllowlist = (config.licenseAllowlist || DEFAULT_LICENSE_ALLOWLIST).map(normalized);
  const minAbstractChars = config.minAbstractChars ?? 400;
  const minCitedByCount = config.minCitedByCount ?? 0;
  const minPublicationYear = config.minPublicationYear ?? 2010;
  const maxPublicationYear = config.maxPublicationYear ?? new Date().getUTCFullYear();
  const requireDoi = config.requireDoi ?? true;
  const requireJournalArticle = config.requireJournalArticle ?? true;
  const requireOpenAccess = config.requireOpenAccess ?? true;

  const failures = [];

  if (!record.title || record.title.trim().length < 12) failures.push("missing_or_short_title");
  if (!record.abstractText || record.abstractText.length < minAbstractChars) failures.push("short_abstract");

  if (requireOpenAccess && !record.isOpenAccess) failures.push("not_open_access");

  if (requireDoi && !record.doi) failures.push("missing_doi");

  if (requireJournalArticle && normalized(record.type) !== "journal-article") {
    failures.push("not_journal_article");
  }

  if (!record.license || !licenseAllowlist.includes(normalized(record.license))) {
    failures.push("license_not_allowlisted");
  }

  if (typeof record.citedByCount === "number" && record.citedByCount < minCitedByCount) {
    failures.push("low_citation_count");
  }

  if (
    typeof record.publicationYear === "number" &&
    (record.publicationYear < minPublicationYear || record.publicationYear > maxPublicationYear)
  ) {
    failures.push("publication_year_out_of_range");
  }

  const lang = normalized(record.language);
  const inferredEnglish = inferEnglishFromText(record.title, record.abstractText);
  if (lang && !languageAllowlist.includes(lang)) failures.push("language_not_allowlisted");
  if (!lang && languageAllowlist.includes("en") && !inferredEnglish) failures.push("language_detection_failed");

  return {
    passed: failures.length === 0,
    failures,
  };
}
