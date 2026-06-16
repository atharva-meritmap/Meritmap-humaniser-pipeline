# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 2.2.x | ✅ |
| 2.1.x | ✅ |
| 2.0.x | ✅ |
| < 2.0 | ❌ |

## Responsible Disclosure

Please do **not** open public issues for security vulnerabilities.

Use one of the following channels:

1. GitHub Security Advisory (preferred):
   - https://github.com/rudra496/StealthHumanizer/security/advisories/new
2. Maintainer contact through repository support channels in
   [SUPPORT.md](./SUPPORT.md)

Include:

- Clear vulnerability description
- Reproduction steps or proof of concept
- Impact assessment
- Suggested remediation (if available)

## Security Model Highlights

- User provider keys are stored client-side in browser storage.
- No intentional server-side persistence of user prompts/outputs.
- HTTPS-based provider communication is expected for deployments.
- Dependency updates are monitored via Dependabot and CI checks.

## Corpus Data

- The corpus (`data/papers/papers.jsonl`) contains publicly available academic
  abstracts from OpenAlex. No PII or sensitive data is included.
- `public/corpus-style-model.json` is intentionally published in the public
  directory — it is needed for client-side style model loading and contains only
  aggregated statistical distributions, not raw text.

## Scope Examples

In-scope classes of issues include:

- XSS risks in rendered content paths
- API key exposure risks
- Dependency vulnerabilities with exploitable impact
- Privilege or secret leakage in CI/CD configuration

## Response Targets

- Initial triage acknowledgement: within 5 business days
- Mitigation plan for valid findings: as soon as practical based on severity
- Public disclosure: after remediation is available
