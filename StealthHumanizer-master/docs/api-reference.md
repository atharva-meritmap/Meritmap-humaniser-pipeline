# API Reference

StealthHumanizer exposes Next.js API routes for text humanization, detection, grammar checking, and file handling. All routes accept `POST` with JSON bodies and return JSON responses.

**Base URL:** `http://localhost:3000` (local) or your deployment URL.

---

## Authentication

API keys for AI providers are passed in the request body (`apiKey` field). Keys are never stored server-side — they are forwarded directly to the selected provider.

---

## Rate Limiting

All routes enforce per-IP rate limiting (30 requests/minute by default). Batch routes allow 15 requests/minute. Exceeding the limit returns `429 Too Many Requests`.

---

## Routes

### `POST /api/humanize`

Primary humanization endpoint with full 4-layer pipeline.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Source text to humanize |
| `model` | string | Yes | Provider ID (e.g., `gemini`, `openai`) |
| `apiKey` | string | Yes | Provider API key |
| `level` | string | No | Rewrite level: `light`, `medium`, `aggressive`, `ninja` |
| `style` | string | No | Style preset: `humanize`, `academic`, `casual`, `professional`, `creative`, `technical` |
| `tone` | string | No | Tone preset (e.g., `conversational`, `journalistic`) |
| `customTone` | string | No | Custom tone description |
| `language` | string | No | Language code (e.g., `en`, `zh-CN`) |
| `purpose` | string | No | Text purpose (e.g., `essay`, `blog`, `email`) |
| `targetScore` | number | No | Target human score (0-100) |
| `writingSample` | string | No | Reference writing sample for style matching |
| `postprocess` | boolean | No | Enable post-processing layer (default: `true`) |
| `chainModels` | string[] | No | Additional model IDs for multi-model chaining |
| `apiKeys` | object | No | Additional API keys for chained models |
| `batchTexts` | string[] | No | Array of texts for batch processing |

**Response:**

```json
{
  "success": true,
  "fullText": "Humanized output...",
  "score": 85,
  "sentences": [...],
  "model": "gemini",
  "passes": 2,
  "provenanceDisclosure": { ... }
}
```

### `POST /api/humanize-batch`

Batch humanization for multiple texts (up to 20).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `texts` | string[] | Yes | Array of texts (max 20, 5000 chars each) |
| `model` | string | Yes | Provider ID |
| `apiKey` | string | Yes | Provider API key |
| `level` | string | No | Rewrite level |
| `style` | string | No | Style preset |
| `tone` | string | No | Tone preset |

### `POST /api/detect`

AI detection scoring using built-in heuristics or GPTZero API.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to analyze |
| `useGptZero` | boolean | No | Use GPTZero API (requires `gptZeroApiKey`) |
| `gptZeroApiKey` | string | No | GPTZero API key |

**Response:**

```json
{
  "success": true,
  "score": 45,
  "classification": "mixed",
  "confidence": { "low": 30, "high": 60 },
  "metrics": { "perplexity": 89, "burstiness": 50, ... },
  "sentences": [...]
}
```

### `POST /api/grammar`

Grammar and spell checking with LLM-backed analysis and local fallback.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to check |
| `model` | string | No | Provider ID for LLM checking |
| `apiKey` | string | No | Provider API key |

### `POST /api/alternative`

Generate alternative rewrites for a specific sentence.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `original` | string | Yes | Original text |
| `current` | string | Yes | Current rewritten version |
| `model` | string | Yes | Provider ID |
| `apiKey` | string | Yes | Provider API key |
| `level` | string | No | Rewrite level |
| `style` | string | No | Style preset |
| `tone` | string | No | Tone preset |

**Response:**

```json
{
  "success": true,
  "alternatives": ["Alternative 1...", "Alternative 2...", "Alternative 3..."]
}
```

### `POST /api/rehumanize`

Re-humanize flagged sentences with regression guard.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `originalText` | string | Yes | Original input text |
| `currentText` | string | Yes | Current humanized text |
| `flaggedSentences` | string[] | Yes | Sentences to re-humanize |
| `model` | string | Yes | Provider ID |
| `apiKey` | string | Yes | Provider API key |
| `level` | string | No | Rewrite level (default: `aggressive`) |
| `style` | string | No | Style preset |
| `tone` | string | No | Tone preset |

### `POST /api/upload`

File upload and text extraction.

**Request body:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF, DOCX, or TXT (max 10 MB) |

**Response:**

```json
{
  "success": true,
  "text": "Extracted text content...",
  "wordCount": 1234,
  "fileName": "document.pdf"
}
```

### `POST /api/model-score`

Logistic regression human-likeness scoring (11 features).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to score |

**Response:**

```json
{
  "success": true,
  "score": 0.78,
  "features": { ... }
}
```

---

## Error Responses

All routes return errors in a consistent format:

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

Common HTTP status codes: `400` (bad request), `413` (body too large), `429` (rate limited), `500` (internal error).

---

## CLI-Only Providers

The `claude-code` and `codex` providers are CLI-only and **rejected** by all web API routes. Use the `stealthhumanizer` CLI to access these providers.
