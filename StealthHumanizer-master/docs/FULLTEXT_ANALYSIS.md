# Full-Text Processing & Analysis (PR2)

PR2 adds document-level full-text extraction and corpus-level analysis on top of the PR1 metadata foundation.

For the next layer (human vs AI benchmark + signal validation), see `docs/HUMAN_AI_SIGNAL_LAYER.md`.

## Scope of PR2

- PDF / DOCX / TXT / HTML extraction with normalization
- Paragraph and sentence segmentation
- Token statistics + lexical/syntactic/stylistic feature extraction
- Corpus-level aggregate pattern outputs
- Output schema definitions for per-document rows and corpus summary

## Commands

```bash
# Run PR2 analysis over current PR1 dataset
npm run papers:analyze -- --config data/papers/analysis.config.example.json
```

Optional flags:

- `--run-id <id>` to control run identifier
- `--max-documents <n>` to run a smoke subset

## Input Sources

The analyzer will try, in order:

1. `fullTextPath` / `localPath` (local filesystem)
2. `fullTextUrl` / `pdfUrl` / `docxUrl` / `textUrl` / `sourceUrl` (network fetch, if enabled)
3. `fullText` or `abstractText` inline fallback

## Output Layout

Generated outputs (ignored by git):

- `data/papers/analysis/runs/<run-id>/documents.features.jsonl`
- `data/papers/analysis/runs/<run-id>/corpus.summary.json`
- `data/papers/analysis/runs/<run-id>/run.manifest.json`
- `data/papers/analysis/current/documents.features.jsonl`
- `data/papers/analysis/current/corpus.summary.json`
- `data/papers/analysis/current/run.manifest.json`

Tracked schemas:

- `data/papers/schemas/pr2-document-features.schema.json`
- `data/papers/schemas/pr2-corpus-summary.schema.json`

## Feature Groups

- **Segmentation:** paragraph count, sentence count
- **Token stats:** token counts, unique counts, TTR, average token length
- **Lexical:** lexical density, stopword ratio, hapax ratio, top keywords
- **Syntactic:** sentence-length stats, punctuation density, clause markers, passive proxy ratio
- **Stylistic:** pronoun ratios, contractions, hedging, transitions, question/exclamation ratios

## Reproducibility

Each run records:

- run ID + timestamp
- source dataset path
- analysis configuration
- feature row hash
- summary hash
- extraction status counts
