import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Run tests in Node.js environment (not browser)
    environment: 'node',
    // Glob patterns for test files
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/app/dashboard/**'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.*'],
    },
    // Increase timeout for bcrypt hashing tests (which are intentionally slow)
    testTimeout: 15000,
  },
});
