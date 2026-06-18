/**
 * Pre-download and load the configured Whisper STT model (same path as the API).
 * Usage: node scripts/preload-stt.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, '..', '.env') });

const modelId = process.env.STT_MODEL ?? 'Xenova/whisper-medium.en';
console.log(`Preloading STT model: ${modelId}`);

const start = Date.now();
const { pipeline, env } = await import('@xenova/transformers');
if (process.env.TRANSFORMERS_CACHE) {
  env.cacheDir = process.env.TRANSFORMERS_CACHE;
}

const transcriber = await pipeline('automatic-speech-recognition', modelId);

// Smoke test: 0.5s silence at 16 kHz
const samples = new Float32Array(8000);
const out = await transcriber(samples, {
  return_timestamps: false,
  language: 'english',
  task: 'transcribe',
});

const elapsed = Math.round((Date.now() - start) / 1000);
console.log(`Model ready in ${elapsed}s. Smoke test output: ${JSON.stringify(out?.text ?? out)}`);
