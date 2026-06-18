import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const r = (p: string) => resolve(__dirname, p);

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['libs/**/src/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@bellasos/contracts': r('libs/shared/contracts/src/index.ts'),
      '@bellasos/observability': r('libs/shared/observability/src/index.ts'),
      '@bellasos/ai-model-registry': r('libs/ai/model-registry/src/index.ts'),
    },
  },
});
