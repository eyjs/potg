import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest 설정.
 *
 * - environment: jsdom (DOM 테스트 가능)
 * - globals: true → describe/it/expect 자동 노출 (Jest 호환)
 * - setupFiles: jest-dom matcher 등록
 * - resolve.alias: tsconfig 의 "@/*" → "./src/*" 와 동일하게 매핑
 *
 * 운영 빌드는 Next.js 가 담당, vitest 는 단위 테스트 전용.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
