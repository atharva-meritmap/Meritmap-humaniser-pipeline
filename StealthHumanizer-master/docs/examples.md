# Examples

## Web UI — Basic Humanization

1. Paste AI-generated draft text.
2. Select **Medium** rewrite and **Professional** style.
3. Set target human score to 80.
4. Run transformation and inspect detector metrics.

## Web UI — Multi-Pass with Ninja Mode

1. Choose **Ninja** rewrite level.
2. Review rewritten output and score deltas.
3. Iterate with alternate tone presets if needed.

## Web UI — Batch Processing

1. Open the **Batch** tab.
2. Paste up to 20 texts (one per block).
3. Select provider, level, and style.
4. Run batch and export results.

## CLI — Detect AI Content

```bash
# Quick detection
stealthhumanizer detect --text "Furthermore, it is important to note that..."

# Detailed report
stealthhumanizer detect --text "Your text..." --report

# Score from a file
stealthhumanizer detect -i draft.txt -j -o scores.json
```

## CLI — Humanize Text

```bash
# Basic humanization with Gemini
stealthhumanizer humanize --model gemini --level medium --text "AI text here..."

# From file to file with academic style
stealthhumanizer humanize -i draft.txt -o humanized.txt --style academic --tone analytical

# From stdin
echo "Draft text..." | stealthhumanizer humanize --model groq --level aggressive

# Using Claude Code locally (no API key needed)
stealthhumanizer humanize --model claude-code -i draft.txt -o output.txt
```

## CLI — List Providers

```bash
# Human-readable table
stealthhumanizer providers

# JSON output
stealthhumanizer providers --json
```

## Programmatic API Usage

```bash
# Using curl
curl -X POST http://localhost:3000/api/humanize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "AI text to humanize...",
    "model": "gemini",
    "apiKey": "YOUR_KEY",
    "level": "aggressive",
    "style": "professional"
  }'

# Detection only (no API key needed)
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Text to analyze..."}'
```

## Research Pipeline

```bash
# Run benchmark smoke test
npm run papers:benchmark -- --config data/papers/benchmark.smoke.config.json --run-id docs-example

# Train model
npm run model:train -- --config data/models/train.smoke.config.json --run-id docs-example

# Evaluate
npm run model:eval -- --manifest data/models/current/run.manifest.json
```

## Good Practices

- Start with lighter rewrite levels for minimal semantic drift.
- Validate with detector and readability metrics before final use.
- Use protected regions when your text contains code or URLs.
- Keep provider-specific behavior notes in PR descriptions when changing prompts.
