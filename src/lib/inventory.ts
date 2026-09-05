export interface StockItem {
  quantity: number;
  low_stock_threshold?: number | null;
}

export function stockThreshold(item: StockItem) {
  return item.low_stock_threshold ?? 3;
}

export function needsReorder(item: StockItem) {
  return item.quantity <= stockThreshold(item);
}

export function reorderQuantity(item: StockItem) {
  return needsReorder(item) ? stockThreshold(item) + 1 - item.quantity : 0;
}

export function matchesInventorySearch(item: Record<string, unknown>, query: string) {
  const fields = ['item_name', 'sku', 'fcc_id', 'supplier', 'make', 'model', 'key_type', 'module', 'category', 'year_from', 'year_to'];
  const text = fields.map(field => String(item[field] ?? '')).join(' ').toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).every(term => text.includes(term));
}
