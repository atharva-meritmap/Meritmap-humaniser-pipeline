#!/usr/bin/env node
/**
 * Bulk Q1-style paper downloader for StealthHumanizer corpus.
 * Downloads open-access English papers with abstracts from OpenAlex,
 * applies quality gates, and saves to data/papers/corpus/papers.jsonl
 * 
 * Usage: node scripts/model/bulk-download-papers.mjs [--count 10000]
 */

import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve(process.cwd(), "data/papers/corpus");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "papers.jsonl");
const BATCH_SIZE = 200;       // OpenAlex max per page
const MAX_PER_QUERY = 10000;  // OpenAlex hard limit per query
const DELAY_MS = 500;         // Rate limit delay between pages

// Quality gates
const MIN_ABSTRACT_WORDS = 50;
const MIN_CITATIONS = 10;
const ALLOWED_LICENSES = new Set([
  "cc-by", "cc-by-sa", "cc0", "cc-by-nc", "cc-by-nc-sa", "cc-by-nd", "cc-by-nc-nd"
]);

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

function mapRecord(work) {
  const abstractText = decodeInvertedIndex(work.abstract_inverted_index);
  const source = work?.primary_location?.source;
  const authors = (work.authorships || [])
    .map(a => a?.author?.display_name)
    .filter(Boolean)
    .slice(0, 5);
  const license = work?.open_access?.license || "";

  return {
    id: work.id || "",
    title: work.title || "",
    text: abstractText,
    domain: guessDomain(work, source),
    year: work.publication_year || null,
    journal: source?.display_name || "",
    authors,
    doi: work.doi || "",
    license,
    citedBy: work.cited_by_count || 0,
    language: work.language || "",
    url: work.primary_location?.landing_page_url || work.doi || "",
    abstractWordCount: abstractText.split(/\s+/).filter(w => w.length > 0).length,
  };
}

function guessDomain(work, source) {
  const title = (work.title || "").toLowerCase();
  const journal = (source?.display_name || "").toLowerCase();
  const subjects = [];
  
  // Extract from concepts/topics if available
  if (work.concepts) {
    for (const c of work.concepts.slice(0, 3)) {
      if (c.score > 0.3) subjects.push(c.display_name?.toLowerCase());
    }
  }
  
  const combined = `${title} ${journal} ${subjects.join(" ")}`;
  
  if (/computer|software|algorithm|neural|machine learning|deep learning|ai\b|nlp|data science/.test(combined)) return "Computer Science";
  if (/medical|clinical|health|disease|patient|cancer|treatment|drug|hospital/.test(combined)) return "Medicine";
  if (/physics|quantum|energy|material|chemistry|molecular|chemical/.test(combined)) return "Physical Sciences";
  if (/biology|gene|cell|protein|evolution|ecology|organism/.test(combined)) return "Life Sciences";
  if (/math|statistic|probability|equation|theorem/.test(combined)) return "Mathematics";
  if (/engineer|mechanical|electrical|civil|structural|design/.test(combined)) return "Engineering";
  if (/psychology|cognitive|behavior|mental|social|sociology/.test(combined)) return "Social Sciences";
  if (/economic|finance|market|business|management/.test(combined)) return "Economics & Business";
  if (/environment|climate|sustain|ecology|earth/.test(combined)) return "Environmental Science";
  if (/education|learn|teach|student|curriculum/.test(combined)) return "Education";
  return "Multidisciplinary";
}

function passesQualityGates(record) {
  if (record.language !== "en") return false;
  if (record.abstractWordCount < MIN_ABSTRACT_WORDS) return false;
  if (record.citedBy < MIN_CITATIONS) return false;
  return true;
}

async function fetchPage(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "StealthHumanizer/2.0 (research@rudrasarker.com)",
        "Accept": "application/json"
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseArgs(argv) {
  let count = 10000;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i], 10) || 10000;
  }
  return { count };
}

async function main() {
  const { count } = parseArgs(process.argv.slice(2));
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Remove existing file if present
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  console.log(`[download] Target: ${count} papers`);
  console.log(`[download] Quality gates: >=${MIN_ABSTRACT_WORDS} words, >=${MIN_CITATIONS} citations, English`);
  console.log("");

  const seenIds = new Set();
  let totalFetched = 0;
  let totalPassed = 0;
  let totalFiltered = 0;
  let totalPages = 0;

  // Query strategies — sorted by citation count to get highest quality first
  const queries = [
    // Batch 1: Highly cited (10+), 2020-2025
    { filter: "is_oa:true,has_abstract:true,from_publication_date:2020-01-01,to_publication_date:2025-12-31", sort: "cited_by_count:desc" },
    // Batch 2: More recent, still cited
    { filter: "is_oa:true,has_abstract:true,from_publication_date:2022-01-01,to_publication_date:2025-12-31", sort: "cited_by_count:desc" },
    // Batch 3: Different date range to get new papers
    { filter: "is_oa:true,has_abstract:true,from_publication_date:2018-01-01,to_publication_date:2021-12-31", sort: "cited_by_count:desc" },
  ];

  const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: "a" });

  for (const query of queries) {
    if (totalPassed >= count) break;

    // First page to get total count
    let firstPage;
    try {
      firstPage = await fetchPage(
        `https://api.openalex.org/works?filter=${query.filter}&per-page=1&sort=${query.sort}`
      );
    } catch (e) {
      console.error(`[download] Failed to query: ${e.message}`);
      continue;
    }

    const totalAvailable = firstPage.meta?.count || 0;
    const maxPages = Math.min(Math.ceil(totalAvailable / BATCH_SIZE), Math.ceil(MAX_PER_QUERY / BATCH_SIZE));
    console.log(`[download] Query "${query.filter.slice(0, 60)}..." → ${totalAvailable.toLocaleString()} available, fetching up to ${maxPages} pages`);

    for (let page = 1; page <= maxPages; page++) {
      if (totalPassed >= count) break;

      const url = `https://api.openalex.org/works?filter=${query.filter}&per-page=${BATCH_SIZE}&page=${page}&sort=${query.sort}&select=id,title,abstract_inverted_index,publication_year,primary_location,authorships,open_access,language,cited_by_count,doi,type,concepts`;

      let data;
      try {
        data = await fetchPage(url);
      } catch (e) {
        console.error(`[download] Page ${page} failed: ${e.message}`);
        if (String(e.message).includes("400")) {
          console.log(`[download] Hit API limit, stopping this query`);
          break;
        }
        await sleep(DELAY_MS * 2);
        continue;
      }

      const results = data.results || [];
      totalFetched += results.length;
      totalPages++;

      for (const work of results) {
        if (totalPassed >= count) break;
        if (seenIds.has(work.id)) continue;
        seenIds.add(work.id);

        const record = mapRecord(work);
        if (passesQualityGates(record)) {
          writeStream.write(JSON.stringify(record) + "\n");
          totalPassed++;
        } else {
          totalFiltered++;
        }
      }

      // Progress every 10 pages
      if (page % 10 === 0 || totalPassed >= count) {
        const pct = Math.min(100, (totalPassed / count * 100)).toFixed(1);
        console.log(`  [page ${page}/${maxPages}] fetched: ${totalFetched.toLocaleString()} | passed: ${totalPassed.toLocaleString()} | filtered: ${totalFiltered.toLocaleString()} | ${pct}%`);
      }

      await sleep(DELAY_MS);
    }

    console.log(`[download] Query done. Total so far: ${totalPassed.toLocaleString()} papers\n`);
  }

  writeStream.end();

  await new Promise(resolve => writeStream.on("finish", resolve));

  console.log("\n========== DOWNLOAD COMPLETE ==========");
  console.log(`  Total fetched:  ${totalFetched.toLocaleString()}`);
  console.log(`  Passed gates:   ${totalPassed.toLocaleString()}`);
  console.log(`  Filtered out:   ${totalFiltered.toLocaleString()}`);
  console.log(`  Output:         ${OUTPUT_FILE}`);
  console.log(`  File size:      ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1)} MB`);
  console.log("======================================");
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
