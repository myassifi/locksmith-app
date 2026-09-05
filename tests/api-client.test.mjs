import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = new EventTarget();
const source = readFileSync(new URL('../src/integrations/api/client.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '({ PROD: true, VITE_API_URL: "" })');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { api } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('an older unauthorized request cannot clear a newer login', async () => {
  api.setToken('old');
  let finish;
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const pending = api.getMe();
  api.setToken('new');
  finish(new Response(JSON.stringify({ error: 'Expired' }), { status: 401 }));
  await assert.rejects(pending, /Expired/);
  assert.equal(api.getToken(), 'new');
});

test('temporary server errors preserve the session token', async () => {
  api.setToken('saved-session');
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(api.getMe());
  assert.equal(api.getToken(), 'saved-session');
});

test('profile changes update the UI even when the server returns the same token', async () => {
  api.setToken('unchanged-profile-token');
  let detail;
  const handler = event => { detail = event.detail; };
  window.addEventListener('auth_token_changed', handler);
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'owner', businessName: 'Updated name', token: 'unchanged-profile-token' }));
  await api.updateProfile({ businessName: 'Updated name' });
  window.removeEventListener('auth_token_changed', handler);
  assert.equal(detail.user.businessName, 'Updated name');
});

test('automatic mutation retry reuses the request key', async () => {
  const keys = [];
  globalThis.fetch = async (_url, options) => {
    keys.push(options.headers.get('Idempotency-Key'));
    if (keys.length === 1) throw new TypeError('Lost response');
    return new Response(JSON.stringify({ id: 'created-job' }));
  };
  await api.createJob({ jobType: 'spare_key' });
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.ok(keys[0]);
});

test('manual retry after two network failures keeps the same key', async () => {
  const keys = [];
  globalThis.fetch = async (_url, options) => { keys.push(options.headers.get('Idempotency-Key')); throw new TypeError('Offline'); };
  const payload = { ids: ['part'], action: 'add', quantity: 2 };
  await assert.rejects(api.bulkUpdateInventory(payload), /Retry the same change safely/);
  globalThis.fetch = async (_url, options) => { keys.push(options.headers.get('Idempotency-Key')); return new Response('{"success":true}'); };
  await api.bulkUpdateInventory(payload);
  assert.equal(new Set(keys).size, 1);
});

test('a confirmed validation failure allows a fresh request', async () => {
  const keys = [];
  globalThis.fetch = async (_url, options) => { keys.push(options.headers.get('Idempotency-Key')); return new Response('{"error":"Insufficient stock"}', { status: 409 }); };
  await assert.rejects(api.createJob({ jobType: 'house_rekey' }));
  await assert.rejects(api.createJob({ jobType: 'house_rekey' }));
  assert.notEqual(keys[0], keys[1]);
});
