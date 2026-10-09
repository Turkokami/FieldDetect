# Tests

```bash
npm test                     # unit tests; DB tests are skipped
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/fielddetect_test npm test
```

- `tests/unit`: pure functions (matching, totals, units, catalog prices, cron and API-key helpers, activity summaries).
- `tests/db`: route handlers against a real Postgres (API keys, `/api/integrations/*`, the public estimate API, price-list seeding). They apply migrations to `TEST_DATABASE_URL`, create their own orgs, and refuse non-local hosts unless `ALLOW_REMOTE_TEST_DB=1`. Never point this at production.
