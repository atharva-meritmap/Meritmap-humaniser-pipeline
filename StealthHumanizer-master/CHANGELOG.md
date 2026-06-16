# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project follows [Semantic Versioning](https://semver.org/).

## [2.2.0] - 2026-06-02

### Added

- Full CLI tool (`stealthhumanizer` / `stealth-humanize`) with `humanize`, `detect`,
  and `providers` commands. Supports stdin, file I/O, JSON output, all rewrite levels,
  styles, tones, languages, and domains.
- Two local CLI-runner providers (`claude-code`, `codex`) that use existing CLI logins
  instead of API keys — confined with disabled tools, read-only sandbox, and isolated
  working directories.
- Batch humanization API (`POST /api/humanize-batch`) for up to 20 texts concurrently
  with 3 parallel API calls.
- GPTZero API integration with local heuristic fallback for AI detection scoring.
- Grammar checking API (`POST /api/grammar`) with LLM-backed analysis and local fallback.
- Protected region extraction/restoration — code blocks, links, URLs, and mentions are
  preserved verbatim during humanization.
- Rehumanize API (`POST /api/rehumanize`) with regression guard that falls back to
  lighter rewrites when semantic drift is detected (Jaccard + n-gram overlap).
- Logistic regression human-likeness scorer (`POST /api/model-score`) with 11 text
  features.
- File upload with magic-byte validation for PDF (pdfjs-dist), DOCX (mammoth), and TXT
  extraction (max 10 MB).
- Standardized API error handling module (`lib/api-response.ts`) with consistent error
  response format across all routes.
- Shared text utilities module (`lib/text-utils.ts`) deduplicating sentence splitting
  and word counting.
- Unit test suites for detector engine (25+ tests), rate limiter, and input validation.
- CLI regression test suite (18 tests) with mocked provider fetch and fake CLI runners.
- SEO: JSON-LD structured data, FAQ schema, programmatic robots.txt and sitemap.xml.
- `.env.example` documenting all 15 provider API key variables plus CLI overrides.
- SECURITY.md supported versions table and responsible disclosure policy.
- Comprehensive troubleshooting guide (`docs/TROUBLESHOOTING.md`).
- GitHub issue templates for bug reports, feature requests, and API key issues.
- Release workflow for tag-based GitHub releases with changelog validation.

### Changed

- Security hardening: Content-Security-Policy headers, X-Frame-Options DENY, HSTS,
  X-Content-Type-Options nosniff, per-IP rate limiting (30 req/min default), SSRF
  prevention via Cloudflare account ID validation, XSS-safe error responses.
- API routes enforce CLI-only provider rejection — browser and serverless contexts
  cannot spawn `claude-code` or `codex` subprocesses.
- Detector calibrated with corpus-derived thresholds instead of static heuristics.
- Architecture doc updated to reflect current provider count and module structure.
- CLI binary path configurable via `STEALTHHUMANIZER_CLAUDE_CODE_BIN` and
  `STEALTHHUMANIZER_CODEX_BIN` environment variables.

### Fixed

- Performance: `detectAI()` no longer re-runs on every React render (useMemo fix).
- EPIPE crash on CLI stdin when child process exits early.
- PDF upload parsing stability (pdfjs-dist replacing pdf-parse).
- Score regressions in rehumanize loop — regression guard prevents semantic drift.
- pnpm-lock.yaml synced with package.json (dotenv dependency added).
- CI/CD workflow branch triggers updated for `master` branch.
- Client bundle crash from `node:fs` import in browser-targeted `style-model.ts`.
- LinkedIn URL corrected in `Footer.tsx`.

### Security

- Per-IP rate limiting on all API routes with configurable window.
- Input validation on all endpoints (length, type, format checks).
- File upload magic-byte validation prevents content-type spoofing.
- CLI runners confined: `claude-code` runs with `--tools ""` (all tools disabled);
  `codex` runs with `--sandbox read-only`, isolated directory, no env inheritance.
- SSRF prevention: Cloudflare account IDs validated as 32-char hex strings.
- API error responses sanitized to prevent information leakage.

## [2.1.0] - 2026-04-11

### Added

- Style-aware humanization engine calibrated from academic writing statistics
  (OpenAlex, 11 domains, 2018–2025).
- Style model capturing real human writing patterns: sentence length distribution
  (mean 20.5, median 20, stddev 9.4), burstiness (0.426), vocabulary diversity
  (69.4%), passive voice ratio (18.1%), transition word frequencies, and sentence
  starter distributions.
- Style-aware prompt builder that injects corpus-calibrated statistical targets
  directly into LLM rewrite prompts.
- Corpus-calibrated detection thresholds — dynamic baselines derived from real
  academic writing rather than hardcoded values.
- Corpus-aware post-processing engine for output refinement.
- Expanded collocation database with 50+ new AI phrase replacements (150+ total).
- Bulk paper download and ingestion pipeline (`scripts/papers/`).

### Changed

- Style model (`public/corpus-style-model.json`) now loads via `fetch()` for
  client-side compatibility (no `node:fs` in browser bundle).
- AI detector uses dynamic corpus-calibrated thresholds instead of static
  heuristics.

### Fixed

- LinkedIn URL corrected in `Footer.tsx`.
- CI/CD workflow branch triggers updated from `main` to `master`.
- Client bundle crash resolved by isolating `node:fs` usage from browser-targeted
  `style-model.ts`.
- Markdown lint configuration fixed for Quality workflow.

## [2.0.0] - 2026-03-31

### Added

- 13 AI provider support with configurable API keys
- 4 rewrite levels including multi-pass ninja mode
- 13 preset writing tones and style controls
- Integrated AI detection heuristic scoring
- Readability analysis layer (Flesch-Kincaid, Gunning Fog)
- PDF and DOCX file upload support
- Grammar check integration
- Multi-language humanization support
- Browser-first API key storage (no server-side persistence)
- Side-by-side humanizer/detector workflow
- Dark/light theme toggle
- Research pipeline scripts for benchmark and training
- Comprehensive docs site with GitHub Pages deployment

### Changed

- Major rewrite from initial prototype to production Next.js application
- Upgraded to Next.js 16, React 19, TypeScript 6
- Modernized CI with Node 20/22 matrix testing
- Overhauled UI with Tailwind CSS and glass-morphism design

### Security

- All user data (API keys, history) stored client-side only
- No server-side persistence of user prompts or outputs

## [1.0.0] - 2026-04-09

### Added

- Comprehensive governance and support documentation (`SUPPORT.md`, improved
  contribution/security policies).
- Professionalized GitHub community templates and automation (`CODEOWNERS`,
  Dependabot, workflow modernization).
- Structured Markdown docs information architecture under `docs/` for onboarding
  and usage.
- Release workflow for tag-based GitHub release publishing.

### Changed

- Overhauled `README.md` for professional onboarding, architecture overview, and
  policy links.
- Modernized CI and Pages workflows for `main` branch and clearer quality gates.
- Added repository hygiene baselines (`.editorconfig`, `.gitattributes`, refined
  `.gitignore`).

### Removed

- Removed duplicate root-level `FUNDING.yml` in favor of `.github/FUNDING.yml`.
