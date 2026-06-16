# Contributing to StealthHumanizer

Thank you for contributing to StealthHumanizer. This guide defines the repository's development, review, and release expectations.

## Table of Contents

- [Development Setup](#development-setup)
- [Branching, Commits, and Pull Requests](#branching-commits-and-pull-requests)
- [Issue Triage and Prioritization](#issue-triage-and-prioritization)
- [Coding Standards](#coding-standards)
- [Validation Checklist](#validation-checklist)

## Development Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/rudra496/StealthHumanizer.git
cd StealthHumanizer
npm ci
npm run dev
```

Open `http://localhost:3000` and configure API keys in the app settings.

## Branching, Commits, and Pull Requests

### Branching standard

- Base branch: `main`
- Use descriptive topic branches, for example:
  - `feat/provider-timeout-handling`
  - `fix/detector-score-rounding`
  - `docs/readme-information-architecture`

### Commit standard

Use concise conventional-style commit prefixes:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `chore:` for maintenance updates
- `ci:` for workflow and automation changes

### Pull request standard

Each PR should:

- Explain **what changed** and **why**.
- Include validation evidence (`lint`, `test`, `build` as applicable).
- Update docs for any behavior or workflow changes.
- Stay focused on one logical unit of change.

## Issue Triage and Prioritization

When filing or triaging issues:

- Use issue templates whenever available.
- Include reproducible steps and expected/actual behavior.
- Label by type (`bug`, `enhancement`, `docs`, `security`).
- For regressions, include the first known affected commit/version if available.
- For provider-specific issues, include provider name and model.

## Coding Standards

- TypeScript strict mode is required.
- Keep API route behavior deterministic and error-safe.
- Prefer small, composable utility functions over monolithic handlers.
- Avoid introducing server-side persistence of user content or keys.
- Keep public interfaces backward-compatible unless explicitly planned.

## Validation Checklist

Before opening a PR, run:

```bash
npm run lint
npm run test:integration
npm run build
```

If any command fails due to known environment limits (for example external network resolution), note it clearly in the PR.
