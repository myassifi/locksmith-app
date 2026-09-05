const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { Operations } = require('../dist/operations');

const serverRoot = path.resolve(__dirname, '..');
const scratch = path.join(serverRoot, 'work');
fs.mkdirSync(scratch, { recursive: true });
const databaseFile = path.join(scratch, `integration-${randomUUID()}.db`);
if (!process.env.TEST_DATABASE_URL) fs.writeFileSync(databaseFile, '');
const databaseUrl = process.env.TEST_DATABASE_URL || `file:${databaseFile.replaceAll('\\', '/')}`;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const operations = new Operations(prisma);
let child;
let port;
let serverOutput = '';

before(async () => {
  fs.mkdirSync(path.join(scratch, 'uploads', 'invoices'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'uploads', 'invoices', 'old.pdf'), 'private test invoice');
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--schema', process.env.TEST_DATABASE_URL ? 'prisma/schema.postgres.prisma' : 'prisma/schema.prisma', '--skip-generate'], { cwd: serverRoot, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' });
  const net = require('node:net');
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  child = spawn(process.execPath, ['dist/index.js'], { cwd: serverRoot, env: { ...process.env, DATABASE_URL: databaseUrl, JWT_SECRET: randomUUID() + randomUUID(), HOST: '127.0.0.1', PORT: String(port), UPLOAD_DIR: path.join(scratch, 'uploads') }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => { serverOutput += chunk; });
  child.stderr.on('data', chunk => { serverOutput += chunk; });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${serverOutput}`);
});
after(async () => {
  if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
  await prisma.$disconnect();
  if (!process.env.TEST_DATABASE_URL && fs.existsSync(databaseFile)) fs.unlinkSync(databaseFile);
});

async function fixture(quantity = 10) {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, password: await bcrypt.hash('test-password-only-123', 4) } });
  const item = await prisma.inventoryItem.create({ data: { userId: user.id, itemName: 'Test remote', sku: 'TEST-1', quantity, cost: 12 } });
  return { user, item };
}
const change = (uid, action, body, fn, key = randomUUID()) => operations.mutate(uid, key, action, body, fn);
const jobInput = (item, qty = 2) => ({ jobType: 'spare_key', status: 'completed', inventory: [{ inventoryItemId: item.id, quantityUsed: qty }] });
const getStock = async id => (await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).quantity;

test('completion, edit, reopen, recomplete and delete apply stock deltas once', async () => {
  const { user, item } = await fixture();
  let input = { ...jobInput(item), status: 'pending' };
  let job = await change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input));
  assert.equal(await getStock(item.id), 10);
  input = { status: 'completed', expectedVersion: job.version };
  job = await change(user.id, 'complete', input, tx => operations.saveJob(tx, user.id, input, job.id));
  assert.equal(await getStock(item.id), 8);
  input = { inventory: [{ inventoryItemId: item.id, quantityUsed: 3 }], expectedVersion: job.version };
  job = await change(user.id, 'parts', input, tx => operations.saveJob(tx, user.id, input, job.id));
  assert.equal(await getStock(item.id), 7);
  assert.equal(job.materialCost, 36);
  input = { status: 'pending', expectedVersion: job.version };
  job = await change(user.id, 'reopen', input, tx => operations.saveJob(tx, user.id, input, job.id));
  assert.equal(await getStock(item.id), 10);
  input = { status: 'completed', expectedVersion: job.version };
  job = await change(user.id, 'recomplete', input, tx => operations.saveJob(tx, user.id, input, job.id));
  assert.equal(await getStock(item.id), 7);
  await change(user.id, 'delete', {}, tx => operations.deleteJob(tx, user.id, job.id));
  assert.equal(await getStock(item.id), 10);
});

test('manual adjustments are versioned, idempotent, and recorded in stock history', async () => {
  const { user, item } = await fixture(4);
  const input = { delta: 3, reason: 'purchased', note: 'Supplier delivery', expectedVersion: item.version };
  const key = randomUUID();
  const adjust = () => change(user.id, 'adjust', input, tx => operations.adjustInventory(tx, user.id, item.id, input), key);
  const first = await adjust();
  const replay = await adjust();
  assert.equal(first.quantity, 7);
  assert.equal(replay.quantity, 7);
  assert.equal(await getStock(item.id), 7);
  const movements = await prisma.inventoryMovement.findMany({ where: { inventoryItemId: item.id } });
  assert.equal(movements.length, 1);
  assert.deepEqual({ type: movements[0].type, delta: movements[0].delta, before: movements[0].quantityBefore, after: movements[0].quantityAfter }, { type: 'purchased', delta: 3, before: 4, after: 7 });
  const stale = { delta: -1, reason: 'used', expectedVersion: item.version };
  await assert.rejects(change(user.id, 'adjust-stale', stale, tx => operations.adjustInventory(tx, user.id, item.id, stale)), /Stock changed/);
});

test('completed and reopened jobs write matching stock movement entries', async () => {
  const { user, item } = await fixture(5);
  const created = await change(user.id, 'create', jobInput(item, 2), tx => operations.saveJob(tx, user.id, jobInput(item, 2)));
  const reopen = { status: 'pending', expectedVersion: created.version };
  await change(user.id, 'reopen', reopen, tx => operations.saveJob(tx, user.id, reopen, created.id));
  const movements = await prisma.inventoryMovement.findMany({ where: { inventoryItemId: item.id }, orderBy: { createdAt: 'asc' } });
  assert.deepEqual(movements.map(movement => [movement.type, movement.delta]), [['job_used', -2], ['job_restored', 2]]);
  assert.equal(await getStock(item.id), 5);
});

test('replaying a lost response returns the same job without deducting twice', async () => {
  const { user, item } = await fixture();
  const input = jobInput(item);
  const key = randomUUID();
  const save = () => change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input), key);
  const [first, second] = await Promise.all([save(), save()]);
  assert.equal(first.id, second.id);
  assert.equal(await getStock(item.id), 8);
  assert.equal(await prisma.job.count({ where: { userId: user.id } }), 1);
});

test('concurrent jobs cannot oversell the last units', async () => {
  const { user, item } = await fixture(2);
  const input = jobInput(item);
  const results = await Promise.allSettled([1, 2].map(() => change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await getStock(item.id), 0);
});

test('insufficient stock rolls back every part and job write', async () => {
  const { user, item } = await fixture(1);
  const input = jobInput(item, 2);
  await assert.rejects(change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input)), /Not enough stock/);
  assert.equal(await getStock(item.id), 1);
  assert.equal(await prisma.job.count({ where: { userId: user.id } }), 0);
});

test('a failed completed-job edit preserves the previous parts and stock', async () => {
  const { user, item } = await fixture(3);
  const input = jobInput(item, 2);
  const job = await change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input));
  const edit = { ...jobInput(item, 5), expectedVersion: job.version };
  await assert.rejects(change(user.id, 'edit', edit, tx => operations.saveJob(tx, user.id, edit, job.id)), /Not enough stock/);
  assert.equal(await getStock(item.id), 1);
  const saved = await prisma.job.findUniqueOrThrow({ where: { id: job.id }, include: { inventory: true } });
  assert.equal(saved.inventory[0].quantityUsed, 2);
  assert.equal(saved.version, job.version);
});

test('a request key cannot be reused for a different change', async () => {
  const { user, item } = await fixture();
  const key = randomUUID();
  const input = jobInput(item);
  await change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input), key);
  const different = jobInput(item, 3);
  await assert.rejects(change(user.id, 'create', different, tx => operations.saveJob(tx, user.id, different), key), /different change/);
  assert.equal(await getStock(item.id), 8);
});

test('historical completed jobs do not change previously managed stock', async () => {
  const { user, item } = await fixture(5);
  const historical = await prisma.job.create({ data: { userId: user.id, jobType: 'spare_key', status: 'completed', inventory: { create: { inventoryItemId: item.id, quantityUsed: 2 } } } });
  const input = { notes: 'Updated note', expectedVersion: 0 };
  const saved = await change(user.id, 'edit', input, tx => operations.saveJob(tx, user.id, input, historical.id));
  assert.equal(saved.stockTracked, false);
  assert.equal(await getStock(item.id), 5);
  await change(user.id, 'delete', {}, tx => operations.deleteJob(tx, user.id, historical.id));
  assert.equal(await getStock(item.id), 5);
});

test('stock cost is snapshotted and does not change when purchase cost changes', async () => {
  const { user, item } = await fixture();
  const input = jobInput(item);
  const job = await change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input));
  await prisma.inventoryItem.update({ where: { id: item.id }, data: { cost: 99 } });
  const edit = { notes: 'Keep original cost', expectedVersion: job.version, inventory: input.inventory };
  const result = await change(user.id, 'edit', edit, tx => operations.saveJob(tx, user.id, edit, job.id));
  assert.equal(result.materialCost, 24);
  assert.equal(await getStock(item.id), 8);
});

test('bulk changes roll back entirely and replay without adding twice', async () => {
  const { user, item } = await fixture(5);
  const other = await prisma.inventoryItem.create({ data: { userId: user.id, itemName: 'Other', quantity: 1 } });
  const invalid = { ids: [item.id, other.id], action: 'subtract', quantity: 2 };
  await assert.rejects(change(user.id, 'bulk', invalid, tx => operations.bulkInventory(tx, user.id, invalid)), /Not enough stock/);
  assert.equal(await getStock(item.id), 5);
  const input = { ids: [item.id, other.id], action: 'add', quantity: 2 };
  const key = randomUUID();
  for (let i = 0; i < 2; i++) await change(user.id, 'bulk', input, tx => operations.bulkInventory(tx, user.id, input), key);
  assert.equal(await getStock(item.id), 7);
  assert.equal(await getStock(other.id), 3);
});

test('stale stock counts and job edits are rejected', async () => {
  const { user, item } = await fixture();
  const input = jobInput(item);
  const job = await change(user.id, 'create', input, tx => operations.saveJob(tx, user.id, input));
  const stock = { quantity: 10, expectedVersion: 0 };
  await assert.rejects(change(user.id, 'stock', stock, tx => operations.saveInventory(tx, user.id, stock, item.id)), /Stock changed/);
  const invalid = { notes: 'stale', expectedVersion: 99 };
  await assert.rejects(change(user.id, 'job', invalid, tx => operations.saveJob(tx, user.id, invalid, job.id)), /job changed/);
});

test('cross-owner records and injected fields cannot be written', async () => {
  const one = await fixture(); const two = await fixture();
  const input = jobInput(two.item);
  await assert.rejects(change(one.user.id, 'job', input, tx => operations.saveJob(tx, one.user.id, input)), /not found/);
  await assert.rejects(change(one.user.id, 'item', { itemName: 'hijack' }, tx => operations.saveInventory(tx, one.user.id, { itemName: 'hijack' }, two.item.id)), /not found/);
  await assert.rejects(change(one.user.id, 'item', { itemName: 'hijack', userId: two.user.id }, tx => operations.saveInventory(tx, one.user.id, { itemName: 'hijack', userId: two.user.id })), /Unsupported field/);
  assert.equal(await getStock(two.item.id), 10);
  const customer = await prisma.customer.create({ data: { userId: two.user.id, name: 'Other account' } });
  const job = { ...jobInput(one.item), customerId: customer.id };
  await assert.rejects(change(one.user.id, 'job', job, tx => operations.saveJob(tx, one.user.id, job)), /Customer not found/);
});

test('invoice imports validate all rows and replay only once', async () => {
  const { user, item } = await fixture();
  const row = { sku: item.sku, description: 'Remote', quantity: 2, price: 12 };
  const invalid = { items: [row, { ...row, quantity: -1 }] };
  await assert.rejects(change(user.id, 'invoice', invalid, tx => operations.importItems(tx, user.id, invalid)), /nonnegative/);
  assert.equal(await getStock(item.id), 10);
  const input = { items: [row] }; const key = randomUUID();
  for (let i = 0; i < 2; i++) await change(user.id, 'invoice', input, tx => operations.importItems(tx, user.id, input), key);
  assert.equal(await getStock(item.id), 12);
});

test('HTTP login, ownership, input validation, and completion flow', async () => {
  const { user, item } = await fixture();
  const other = await fixture();
  const base = `http://127.0.0.1:${port}`;
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ` ${user.email.toUpperCase()} `, password: 'test-password-only-123' }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const send = (url, body, method = 'POST') => fetch(base + url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify(body) });
  assert.equal((await fetch(base + '/api/inventory')).status, 401);
  assert.equal((await send('/auth/signup', { email: 'anything@example.test', password: 'password' })).status, 403);
  assert.equal((await send(`/api/inventory/${other.item.id}`, { itemName: 'stolen' }, 'PUT')).status, 404);
  assert.equal((await send(`/api/inventory/${item.id}`, { userId: other.user.id }, 'PUT')).status, 400);
  const response = await send('/api/jobs', jobInput(item));
  assert.equal(response.status, 200, await response.clone().text());
  const job = await response.json();
  assert.equal(await getStock(item.id), 8);
  assert.equal((await send(`/api/inventory/${item.id}`, {}, 'DELETE')).status, 409);
  assert.equal((await send(`/api/jobs/${job.id}`, { status: 'cancelled', expectedVersion: job.version }, 'PUT')).status, 200);
  assert.equal(await getStock(item.id), 10);
  assert.equal((await fetch(base + '/uploads/invoices/old.pdf')).status, 404);
  assert.equal((await fetch(base + '/uploads//invoices/old.pdf')).status, 404);
  assert.equal((await fetch(base + '/uploads/%69nvoices/old.pdf')).status, 404);
  const profile = await send('/auth/profile', { password: 'new-test-password-only-123' }, 'PUT');
  assert.equal(profile.status, 200);
  assert.equal((await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  const replacement = await profile.json();
  assert.equal((await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${replacement.token}` } })).status, 200);
});
