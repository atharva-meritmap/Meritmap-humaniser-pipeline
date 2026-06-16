import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { normalizeText, stripHtml } from "./text-normalization.mjs";

function safeUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function extensionFromPath(value) {
  const url = safeUrl(value);
  const parsedPath = url ? url.pathname : value;
  return path.extname(parsedPath || "").toLowerCase();
}

function inferFileType(reference, contentType) {
  const ext = extensionFromPath(reference);
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".txt" || ext === ".md" || ext === ".text") return "text";
  if (ext === ".html" || ext === ".htm") return "html";
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("wordprocessingml") || ct.includes("msword")) return "docx";
  if (ct.includes("html")) return "html";
  return "text";
}

async function parsePdf(buffer) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text.trim();
}

async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result?.value || "";
}

function parseText(buffer, type) {
  const plain = buffer.toString("utf8");
  return type === "html" ? stripHtml(plain) : plain;
}

async function extractFromBuffer({ buffer, reference, contentType }) {
  const type = inferFileType(reference, contentType);
  if (type === "pdf") return { type, text: await parsePdf(buffer) };
  if (type === "docx") return { type, text: await parseDocx(buffer) };
  return { type, text: parseText(buffer, type) };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "*/*" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timer);
  }
}

function getRecordCandidates(record) {
  const urls = [
    record.fullTextUrl,
    record.pdfUrl,
    record.docxUrl,
    record.textUrl,
    record.sourceUrl,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);
  return {
    localPaths: [record.fullTextPath, record.localPath].filter(
      (value) => typeof value === "string" && value.trim().length > 0
    ),
    urls,
    inlineText: [record.fullText, record.abstractText].find(
      (value) => typeof value === "string" && value.trim().length > 0
    ),
  };
}

async function readLocalPath(candidate, localRoot) {
  const fullPath = path.isAbsolute(candidate) ? candidate : path.resolve(localRoot, candidate);
  const buffer = await fs.readFile(fullPath);
  return { fullPath, buffer };
}

export async function extractNormalizedFullText(record, config) {
  const errors = [];
  const timeoutMs = config.fetchTimeoutMs ?? 20_000;
  const minChars = config.minExtractedChars ?? 500;
  const allowNetworkFetch = config.allowNetworkFetch !== false;
  const localRoot = config.localRoot || process.cwd();
  const candidates = getRecordCandidates(record);

  for (const localPath of candidates.localPaths) {
    try {
      const local = await readLocalPath(localPath, localRoot);
      const extracted = await extractFromBuffer({
        buffer: local.buffer,
        reference: local.fullPath,
      });
      const normalized = normalizeText(extracted.text);
      if (normalized.length >= minChars) {
        return {
          status: "ok",
          sourceKind: "local",
          sourceRef: local.fullPath,
          textType: extracted.type,
          normalizedText: normalized,
          charCount: normalized.length,
          errors,
        };
      }
      errors.push(`local_too_short:${local.fullPath}`);
    } catch (error) {
      errors.push(`local_read_failed:${localPath}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (allowNetworkFetch) {
    for (const url of candidates.urls) {
      try {
        const fetched = await fetchWithTimeout(url, timeoutMs);
        const extracted = await extractFromBuffer({
          buffer: fetched.buffer,
          reference: url,
          contentType: fetched.contentType,
        });
        const normalized = normalizeText(extracted.text);
        if (normalized.length >= minChars) {
          return {
            status: "ok",
            sourceKind: "url",
            sourceRef: url,
            textType: extracted.type,
            normalizedText: normalized,
            charCount: normalized.length,
            errors,
          };
        }
        errors.push(`url_too_short:${url}`);
      } catch (error) {
        errors.push(`url_fetch_failed:${url}:${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (candidates.inlineText) {
    const normalized = normalizeText(candidates.inlineText);
    return {
      status: normalized.length >= minChars ? "ok_inline_fallback" : "short_inline_fallback",
      sourceKind: "inline",
      sourceRef: record.id || record.doi || "",
      textType: "text",
      normalizedText: normalized,
      charCount: normalized.length,
      errors,
    };
  }

  return {
    status: "failed",
    sourceKind: "none",
    sourceRef: "",
    textType: "none",
    normalizedText: "",
    charCount: 0,
    errors,
  };
}
