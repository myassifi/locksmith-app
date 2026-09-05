import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/inventory.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { stockThreshold, needsReorder, reorderQuantity, matchesInventorySearch } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('a configured zero threshold is preserved', () => {
  const item = { quantity: 1, low_stock_threshold: 0 };
  assert.equal(stockThreshold(item), 0);
  assert.equal(needsReorder(item), false);
  assert.equal(reorderQuantity(item), 0);
});

test('items exactly at the threshold appear in reorder and have a positive order quantity', () => {
  const item = { quantity: 3, low_stock_threshold: 3 };
  assert.equal(needsReorder(item), true);
  assert.equal(reorderQuantity(item), 1);
});

test('empty stock always needs attention, including a zero threshold', () => {
  assert.equal(needsReorder({ quantity: 0, low_stock_threshold: 0 }), true);
  assert.equal(reorderQuantity({ quantity: 0, low_stock_threshold: 0 }), 1);
  assert.equal(reorderQuantity({ quantity: 0 }), 4);
});

test('search combines terms across vehicle, SKU and chip fields', () => {
  const item = { make: 'Toyota', model: 'Camry', sku: 'TOY-8A', key_type: 'ID46' };
  assert.equal(matchesInventorySearch(item, '  TOYOTA   camry '), true);
  assert.equal(matchesInventorySearch(item, 'camry ID46'), true);
  assert.equal(matchesInventorySearch(item, 'Honda ID46'), false);
});

test('search handles missing optional fields and blank queries', () => {
  assert.equal(matchesInventorySearch({ sku: 'TR47' }, 'tr47'), true);
  assert.equal(matchesInventorySearch({}, ''), true);
  assert.equal(matchesInventorySearch({}, 'remote'), false);
});
