# BellasOS v0.1.0 — Known broken / incomplete areas

This tag is an early snapshot saved for history. **Do not treat it as stable.**

## Platform

- Requires manual `.env` setup; file must be **UTF-8** (UTF-16 breaks Node/dotenv on Windows).
- API/worker/web dev processes must be started from the repo root (`npm run dev:*`).
- Ollama must be running and reachable (`OLLAMA_BASE_URL`) or the AI gateway falls back to mock output.

## Web shell (Jarvis UI)

- Voice session uses local server-side Whisper; first transcription can take minutes while the model downloads.
- Speech capture is sensitive to mic permissions, browser (Chrome/Edge recommended), and pause timing (~1.5s silence).
- EQ visualizer and gesture layer are experimental.

## Modules

- Several module panels may still show stub/placeholder data when backend integrations or API keys are missing.
- Social publish, automation devices, and cloud LLM providers need credentials configured in Settings / `.env`.

## Infra

- Docker stack (Postgres, Redis, NATS) is required for full persistence; in-memory fallbacks exist but are limited.

See `README.md` for intended architecture and quick start once issues above are addressed.