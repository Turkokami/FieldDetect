// Database tests (tests/db) run only when TEST_DATABASE_URL is set, and only
// against a local database unless ALLOW_REMOTE_TEST_DB=1. They create their
// own orgs and never delete anything, but never point this at production.
const url = process.env.TEST_DATABASE_URL;
if (url) {
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1"].includes(host) && process.env.ALLOW_REMOTE_TEST_DB !== "1") {
    throw new Error(`Refusing to run DB tests against ${host}. Use a local database or set ALLOW_REMOTE_TEST_DB=1.`);
  }
  process.env.DATABASE_URL = url;
}
