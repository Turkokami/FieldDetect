import { execSync } from "child_process";
import { describe } from "vitest";

export const hasDb = !!process.env.TEST_DATABASE_URL;
export const describeDb = hasDb ? describe : describe.skip;

let migrated = false;
export function migrateTestDb() {
  if (migrated || !hasDb) return;
  execSync("npx prisma migrate deploy", { stdio: "ignore", env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL } });
  migrated = true;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
