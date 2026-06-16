# Configuration

StealthHumanizer uses app-level controls and script configuration files.

## Runtime App Configuration

- **Provider selection** and API key entry
- **Rewrite level** and target score
- **Style and tone presets**

## Script Configurations

Example configs are in:

- `data/papers/*.config.example.json`
- `data/models/*.config.example.json`

Use explicit config paths when running scripts.

```bash
npm run papers:benchmark -- --config data/papers/benchmark.config.example.json
npm run model:train -- --config data/models/train.config.example.json
```

## Environment Notes

- Keep secrets out of source control.
- Use `.env` only for local development where required.
- Review `.gitignore` and `SECURITY.md` before adding new configuration files.
