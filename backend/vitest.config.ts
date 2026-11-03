import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
      DEMO_MODE: 'false',
    },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false,
    // SQLite + bcrypt on clinic PCs: several requests per test can pass 5 s.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
