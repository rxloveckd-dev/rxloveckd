import { execSync } from 'node:child_process';

/** Fresh SQLite test database from the Prisma schema before the run. */
export default function setup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
