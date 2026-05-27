/**
 * Vitest 글로벌 setup.
 *
 * - jest-dom matchers (toBeInTheDocument, toHaveTextContent 등) 등록
 * - afterEach 마다 RTL render 결과 자동 정리 (vitest@2+ 는 자동 cleanup 지만 명시)
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
