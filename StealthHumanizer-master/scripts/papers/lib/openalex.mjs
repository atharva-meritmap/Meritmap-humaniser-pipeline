const OPENALEX_BASE_URL = "https://api.openalex.org/works";

function decodeInvertedIndex(indexObj) {
  if (!indexObj || typeof indexObj !== "object") return "";
  const wordPositions = [];
  for (const [token, positions] of Object.entries(indexObj)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      wordPositions.push([Number(pos), token]);
    }
  }
  wordPositions.sort((a, b) => a[0] - b[0]);
  return wordPositions.map(([, token]) => token).join(" ");
}

function mapOpenAlexWork(work) {
  const authors = Array.isArray(work.authorships)
    ? work.authorships
        .map((a) => a?.author?.display_name)
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const source = work?.primary_location?.source;
  const license = work?.open_access?.oa_status || work?.open_access?.license || "";

  return {
    id: work.id || "",
    source: "openalex",
    sourceRecordId: work.id || "",
    title: work.title || "",
    abstractText: decodeInvertedIndex(work.abstract_inverted_index),
    doi: work.doi || "",
    authors,
    firstAuthor: authors[0] || "",
    language: work.language || "",
    license,
    isOpenAccess: Boolean(work?.open_access?.is_oa),
    publicationYear: work.publication_year || null,
    publicationDate: work.publication_date || "",
    citedByCount: work.cited_by_count || 0,
    type: work.type || "",
    journal: source?.display_name || "",
    journalIssnL: source?.issn_l || "",
    hostOrganization: source?.host_organization_name || "",
    sourceUrl: work.primary_location?.landing_page_url || work.primary_location?.pdf_url || "",
    fetchedAt: new Date().toISOString(),
  };
}

function buildFilterQuery(queryConfig) {
  const filters = [];
  if (queryConfig.fromYear) filters.push(`from_publication_date:${queryConfig.fromYear}-01-01`);
  if (queryConfig.toYear) filters.push(`to_publication_date:${queryConfig.toYear}-12-31`);
  if (queryConfig.openAccessOnly !== false) filters.push("is_oa:true");
  filters.push("type:journal-article");
  if (queryConfig.hasAbstractOnly !== false) filters.push("has_abstract:true");
  return filters.join(",");
}

function stableSort(records) {
  return records.sort((a, b) => {
    const keyA = `${a.publicationYear || 0}|${a.doi || ""}|${a.id}`;
    const keyB = `${b.publicationYear || 0}|${b.doi || ""}|${b.id}`;
    return keyA.localeCompare(keyB);
  });
}

export async function fetchOpenAlexRecords(queryConfig, fetchOptions = {}) {
  const perPage = Math.min(Math.max(queryConfig.perPage || 100, 1), 200);
  const pages = Math.max(queryConfig.pages || 1, 1);
  const timeoutMs = fetchOptions.timeoutMs ?? 25_000;
  const records = [];
  const requests = [];

  const filter = buildFilterQuery(queryConfig);
  for (let page = 1; page <= pages; page++) {
    const url = new URL(OPENALEX_BASE_URL);
    url.searchParams.set("search", queryConfig.query || "");
    url.searchParams.set("filter", filter);
    url.searchParams.set("per-page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "publication_year:desc");
    requests.push(url.toString());
  }

  for (const requestUrl of requests) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(requestUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`OpenAlex request failed (${res.status}) for ${requestUrl}`);
      }
      const payload = await res.json();
      const mapped = Array.isArray(payload.results) ? payload.results.map(mapOpenAlexWork) : [];
      records.push(...mapped);
    } finally {
      clearTimeout(timer);
    }
  }

  return stableSort(records);
}
