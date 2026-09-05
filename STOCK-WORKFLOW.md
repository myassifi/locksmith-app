# Inventory workflow and rollout

New jobs track stock automatically. Pending/in-progress jobs do not reserve parts. Completing (or marking paid) consumes the selected quantities. Editing a completed job applies the difference; cancelling, reopening or deleting restores its consumed quantities. Insufficient stock rejects the whole change. Purchase cost is stored on each job part so later price edits do not change historical material cost.

Jobs that already existed before this release have `stockTracked=false`. Their counts remain manually managed, including on edit/delete. This prevents a software update from reapplying historical stock adjustments. The job form labels these records. Reconcile historical stock separately; do not mass-enable this flag on completed jobs.

Stock writes, bulk adjustments and invoice imports are transactional. Mutations require an `Idempotency-Key`; the frontend retains it across uncertain retries. The database stores a receipt with the request hash and response. Do not prune receipts without defining a maximum retry lifetime first. Job edits and absolute stock counts include a version to reject stale writes. Relative bulk adjustments operate on current stock. Deleting an item referenced by a job is blocked to preserve history.

## Before deployment

1. Back up the database and persistent uploads. Verify against a staging copy.
2. Set `JWT_SECRET` to a unique, randomly generated secret of at least 32 bytes. Startup refuses a missing, short or former fallback secret. Changing the secret signs out existing sessions.
3. Change any existing default password through Settings. Removing bootstrap code does not change passwords already stored in the database. Password changes revoke older tokens; the current browser receives a replacement token.
4. Set `CORS_ORIGIN` to the exact frontend origin when frontend/backend are separate. Same-origin hosting needs no CORS grant. Set `UPLOAD_DIR` to the existing persistent upload directory to retain existing image URLs. Historical invoice PDFs are no longer served; new invoice parsing stays in memory.
5. Run the schema update deliberately in staging: `npx prisma db push --schema prisma/schema.postgres.prisma`. Changes add version fields, `stockTracked`, job-part `unitCost`, user `authVersion`, and `MutationReceipt`. No historical stock quantities are rewritten. Never use `--accept-data-loss` to force an unexpected schema warning.
6. Run `npm ci`, `npm test`, `npx tsc --noEmit -p tsconfig.app.json`, and `npm run build` at the repository root. In `server`, run `npm ci` and `npm run test:postgres` with both `DATABASE_URL` and `TEST_DATABASE_URL` pointing to a disposable test database. The test suite creates schema/data there.
7. Deploy frontend and backend together after checks pass. Older clients do not supply the new mutation keys/version fields; reload open browsers after deployment.

The existing Railway start scripts still synchronize the schema. Ensure staging and backups above are complete before promotion. The PostgreSQL GitHub Actions job provides production-dialect integration coverage.

## New account setup

Public signup is disabled. With the target database and generated Prisma client configured, run `npm run create-user` in `server` using `OWNER_EMAIL` and a strong `OWNER_PASSWORD` in the environment. It refuses to overwrite an existing account and never logs the password. Remove the password environment value afterward.

## Local integration tests

`npm test` in `server` builds the SQLite client and runs isolated database/HTTP tests. Each run creates its own disposable database under `server/work`. PostgreSQL tests use `npm run test:postgres` and require a disposable `TEST_DATABASE_URL`. Never point tests at live data.

The sign-in limiter is per server process (10 attempts per 15 minutes). If deploying multiple replicas, move it to a shared store or enforce rate limits at the gateway. Configure the trusted proxy count for the actual hosting topology.
