# Getting Started

## Prerequisites

- Node.js 20+
- npm 10+

## Installation

```bash
git clone https://github.com/rudra496/StealthHumanizer.git
cd StealthHumanizer
npm ci
```

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## First Use

### Web UI

1. Add a provider API key in **Settings** (Gemini and Groq are free).
2. Paste source text in the Humanizer.
3. Choose rewrite level, style, and tone.
4. Run humanization and review detector output.
5. Export as TXT, DOCX, or PDF.

### CLI

```bash
# Build the CLI
npm run cli:build

# Detect AI content (no API key needed)
stealthhumanizer detect --text "Furthermore, it is important to note..."

# Humanize with a provider
stealthhumanizer humanize --model gemini -i draft.txt -o humanized.txt

# List all providers
stealthhumanizer providers
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the provider API keys you want to use:

```bash
cp .env.example .env
```

See [Configuration](./configuration.md) for details.

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set your provider API keys in the Vercel dashboard (Project Settings > Environment Variables).

## Next Steps

- [Configuration](./configuration.md)
- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
