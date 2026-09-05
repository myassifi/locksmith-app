import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { ApiError, object, text, number, fields, date } from './validation';

const jobInclude = { customer: true, inventory: { include: { inventoryItem: true } } } as const;
const completed = (status: string) => status === 'completed' || status === 'paid';
const inventoryTextFields = ['sku', 'fccId', 'category', 'make', 'model', 'keyType', 'module', 'supplier', 'imageUrl'] as const;

export function inventoryData(value: unknown, partial = false) {
  const body = object(value);
  fields(body, ['itemName', ...inventoryTextFields, 'quantity', 'cost', 'price', 'yearFrom', 'yearTo', 'lowStockThreshold', 'expectedVersion']);
  const data: Prisma.InventoryItemUncheckedUpdateInput = {};
  if (!partial || body.itemName !== undefined) data.itemName = text(body.itemName, 'Item name', true)!;
  for (const key of inventoryTextFields) if (body[key] !== undefined) data[key] = text(body[key], key);
  if (typeof data.sku === 'string') data.sku = data.sku.toUpperCase();
  for (const key of ['quantity', 'lowStockThreshold', 'cost', 'price'] as const) {
    if (body[key] !== undefined) data[key] = number(body[key], key, key === 'quantity' || key === 'lowStockThreshold');
  }
  for (const key of ['yearFrom', 'yearTo'] as const) if (body[key] !== undefined) data[key] = body[key] === null ? null : number(body[key], key, true);
  return data;
}

export class Operations {
  constructor(private prisma: PrismaClient) {}

  // The receipt and mutation commit together. Retries after a lost response are safe.
  async mutate(userId: string, key: string | undefined, action: string, body: unknown, fn: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) throw new ApiError(400, 'A valid Idempotency-Key is required');
    const hash = createHash('sha256').update(JSON.stringify({ action, body })).digest('hex');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          const receipt = await tx.mutationReceipt.findUnique({ where: { userId_key: { userId, key } } });
          if (receipt) {
            if (receipt.requestHash !== hash) throw new ApiError(409, 'This request key was already used for a different change');
            return JSON.parse(receipt.response);
          }
          const result = await fn(tx);
          const response = JSON.stringify(result);
          await tx.mutationReceipt.create({ data: { userId, key, requestHash: hash, response } });
          return JSON.parse(response);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt < 4 && ['P2034', 'P2002', 'P1008', 'P2028'].includes(code || '')) {
          await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  async saveInventory(tx: Prisma.TransactionClient, userId: string, value: unknown, id?: string) {
    const body = object(value);
    const data = inventoryData(body, !!id);
    const before = id ? await tx.inventoryItem.findFirst({ where: { id, userId } }) : null;
    if (id && !before) throw new ApiError(404, 'Item not found');
    if (before && body.quantity !== undefined) {
      if (body.expectedVersion !== before.version) throw new ApiError(409, 'Stock changed. Refresh this item before saving its count.');
    }
    const from = body.yearFrom !== undefined ? body.yearFrom : before?.yearFrom;
    const to = body.yearTo !== undefined ? body.yearTo : before?.yearTo;
    if (typeof from === 'number' && typeof to === 'number' && from > to) throw new ApiError(400, 'End year must be after start year');
    if (typeof data.sku === 'string') {
      const items = await tx.inventoryItem.findMany({ where: { userId }, select: { id: true, sku: true } });
      if (items.some(item => item.id !== id && item.sku?.trim().toUpperCase() === data.sku)) throw new ApiError(409, 'This SKU already exists');
    }
    if (before) return tx.inventoryItem.update({ where: { id: before.id, userId, version: before.version }, data: { ...data, version: { increment: 1 } } });
    return tx.inventoryItem.create({ data: { ...data, itemName: data.itemName as string, userId } as Prisma.InventoryItemUncheckedCreateInput });
  }

  async bulkInventory(tx: Prisma.TransactionClient, userId: string, value: unknown) {
    const body = object(value);
    fields(body, ['ids', 'action', 'quantity', 'supplier', 'lowStockThreshold', 'versions']);
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 500 || body.ids.some(id => typeof id !== 'string')) throw new ApiError(400, 'Select 1–500 items');
    const ids = [...new Set(body.ids as string[])].sort();
    const items = await tx.inventoryItem.findMany({ where: { userId, id: { in: ids } } });
    if (items.length !== ids.length) throw new ApiError(404, 'One or more items are unavailable');
    const action = body.action || 'add';
    if (!['add', 'subtract', 'set'].includes(String(action))) throw new ApiError(400, 'Invalid stock action');
    const quantity = body.quantity === undefined ? undefined : number(body.quantity, 'Quantity', true);
    const supplier = body.supplier === undefined ? undefined : text(body.supplier, 'Supplier');
    const threshold = body.lowStockThreshold === undefined ? undefined : number(body.lowStockThreshold, 'Low stock threshold', true);
    if (quantity === undefined && supplier === undefined && threshold === undefined) throw new ApiError(400, 'Choose a change to apply');
    const versions = body.versions === undefined ? {} : object(body.versions);
    for (const item of items) {
      if (quantity !== undefined && action === 'set' && versions[item.id] !== item.version) throw new ApiError(409, 'Stock changed. Refresh before setting counts.');
      const next = quantity === undefined ? item.quantity : action === 'add' ? item.quantity + quantity : action === 'subtract' ? item.quantity - quantity : quantity;
      if (next < 0) throw new ApiError(409, `Not enough stock for ${item.itemName}. No items were changed.`);
      await tx.inventoryItem.update({ where: { id: item.id, userId, version: item.version }, data: { quantity: next, supplier, lowStockThreshold: threshold, version: { increment: 1 } } });
    }
    return { success: true, count: items.length };
  }

  async saveJob(tx: Prisma.TransactionClient, userId: string, value: unknown, id?: string) {
    const body = object(value);
    fields(body, ['customerId', 'jobType', 'serviceType', 'vehicleDetails', 'vehicleYear', 'status', 'price', 'materialCost', 'miles', 'jobDate', 'notes', 'inventory', 'expectedVersion']);
    const before = id ? await tx.job.findFirst({ where: { id, userId }, include: jobInclude }) : null;
    if (id && !before) throw new ApiError(404, 'Job not found');
    if (before && body.expectedVersion !== before.version) throw new ApiError(409, 'This job changed. Refresh before editing it.');
    const data: Prisma.JobUncheckedUpdateInput = {};
    for (const key of ['customerId', 'serviceType', 'vehicleDetails', 'vehicleYear', 'notes'] as const) if (body[key] !== undefined) data[key] = text(body[key], key);
    if (!before || body.jobType !== undefined) data.jobType = text(body.jobType, 'Job type', true)!;
    for (const key of ['price', 'miles'] as const) if (body[key] !== undefined) data[key] = number(body[key], key);
    if (body.jobDate !== undefined) data.jobDate = date(body.jobDate, 'Job date');
    const status = body.status === undefined ? before?.status || 'pending' : text(body.status, 'Status', true)!;
    if (!['pending', 'in_progress', 'completed', 'paid', 'cancelled'].includes(status)) throw new ApiError(400, 'Invalid job status');
    data.status = status;
    if (typeof data.customerId === 'string' && !await tx.customer.findFirst({ where: { id: data.customerId, userId } })) throw new ApiError(404, 'Customer not found');
    let selections: Array<{ inventoryItemId: string; quantityUsed: number; unitCost: number }>;
    if (body.inventory === undefined) selections = (before?.inventory || []).map(link => ({ inventoryItemId: link.inventoryItemId, quantityUsed: link.quantityUsed, unitCost: link.unitCost }));
    else {
      if (!Array.isArray(body.inventory) || body.inventory.length > 500) throw new ApiError(400, 'Invalid inventory selection');
      const unique = new Set<string>();
      selections = [];
      for (const raw of body.inventory) {
        const entry = object(raw);
        fields(entry, ['inventoryItemId', 'quantityUsed']);
        const itemId = text(entry.inventoryItemId, 'Inventory item', true)!;
        const quantityUsed = number(entry.quantityUsed, 'Parts used', true);
        if (!quantityUsed || unique.has(itemId)) throw new ApiError(400, 'Parts must have positive quantities and cannot be duplicated');
        unique.add(itemId);
        const item = await tx.inventoryItem.findFirst({ where: { id: itemId, userId } });
        if (!item) throw new ApiError(404, 'Inventory item not found');
        const old = before?.inventory.find(link => link.inventoryItemId === itemId);
        selections.push({ inventoryItemId: itemId, quantityUsed, unitCost: before?.stockTracked && old ? old.unitCost : item.cost });
      }
    }
    // Existing jobs are deliberately exempt until their historical counts are reconciled.
    const tracked = before ? before.stockTracked : true;
    const deltas = new Map<string, number>();
    if (tracked && before && completed(before.status)) for (const link of before.inventory) deltas.set(link.inventoryItemId, -link.quantityUsed);
    if (tracked && completed(status)) for (const link of selections) deltas.set(link.inventoryItemId, (deltas.get(link.inventoryItemId) || 0) + link.quantityUsed);
    await this.adjustStock(tx, userId, deltas);
    if (tracked) data.materialCost = selections.reduce((sum, link) => sum + link.unitCost * link.quantityUsed, 0);
    else if (body.materialCost !== undefined) data.materialCost = number(body.materialCost, 'Material cost');
    const links = selections.map(link => ({ ...link }));
    if (before) return tx.job.update({ where: { id: before.id, userId, version: before.version }, data: { ...data, version: { increment: 1 }, inventory: { deleteMany: {}, create: links } }, include: jobInclude });
    return tx.job.create({ data: { ...data, jobType: data.jobType as string, userId, stockTracked: true, inventory: { create: links } } as Prisma.JobUncheckedCreateInput, include: jobInclude });
  }

  private async adjustStock(tx: Prisma.TransactionClient, userId: string, deltas: Map<string, number>) {
    for (const [id, delta] of [...deltas].sort(([a], [b]) => a.localeCompare(b))) {
      if (!delta) continue;
      const result = await tx.inventoryItem.updateMany({ where: { id, userId, ...(delta > 0 ? { quantity: { gte: delta } } : {}) }, data: { quantity: { decrement: delta }, version: { increment: 1 } } });
      if (result.count !== 1) throw new ApiError(409, 'Not enough stock for this job, or an item is unavailable. No changes were saved.');
    }
  }

  async deleteJob(tx: Prisma.TransactionClient, userId: string, id: string) {
    const job = await tx.job.findFirst({ where: { id, userId }, include: { inventory: true } });
    if (!job) throw new ApiError(404, 'Job not found');
    if (job.stockTracked && completed(job.status)) await this.adjustStock(tx, userId, new Map(job.inventory.map(link => [link.inventoryItemId, -link.quantityUsed])));
    await tx.job.delete({ where: { id, userId } });
    return { success: true };
  }

  async saveCustomer(tx: Prisma.TransactionClient, userId: string, value: unknown, id?: string) {
    const body = object(value);
    fields(body, ['name', 'email', 'phone', 'address', 'notes', 'nextFollowUpAt']);
    const data: Prisma.CustomerUncheckedUpdateInput = {};
    if (!id || body.name !== undefined) data.name = text(body.name, 'Customer name', true)!;
    for (const key of ['email', 'phone', 'address', 'notes'] as const) if (body[key] !== undefined) data[key] = text(body[key], key);
    if (body.nextFollowUpAt !== undefined) data.nextFollowUpAt = body.nextFollowUpAt ? date(body.nextFollowUpAt, 'Follow-up date') : null;
    if (id) return tx.customer.update({ where: { id, userId }, data });
    return tx.customer.create({ data: { ...data, name: data.name as string, userId } as Prisma.CustomerUncheckedCreateInput });
  }

  async importItems(tx: Prisma.TransactionClient, userId: string, value: unknown) {
    const body = object(value);
    fields(body, ['items']);
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 500) throw new ApiError(400, 'Choose 1–500 invoice items');
    const results = [];
    for (const raw of body.items) {
      const item = object(raw);
      fields(item, ['sku', 'description', 'price', 'quantity', 'total', 'supplier', 'category']);
      const sku = text(item.sku, 'SKU', true)!.toUpperCase();
      const quantity = number(item.quantity, 'Quantity', true);
      if (!quantity) throw new ApiError(400, 'Invoice quantities must be positive');
      const cost = number(item.price, 'Unit cost');
      const name = text(item.description, 'Item description', true)!;
      const candidates = await tx.inventoryItem.findMany({ where: { userId }, select: { id: true, sku: true } });
      const matches = candidates.filter(candidate => candidate.sku?.trim().toUpperCase() === sku);
      if (matches.length > 1) throw new ApiError(409, `Resolve duplicate SKU ${sku} before importing`);
      const existing = matches[0];
      const updated = existing
        ? await tx.inventoryItem.update({ where: { id: existing.id, userId }, data: { quantity: { increment: quantity }, version: { increment: 1 } } })
        : await tx.inventoryItem.create({ data: { userId, sku, itemName: name, quantity, cost, supplier: text(item.supplier, 'Supplier'), category: text(item.category, 'Category'), lowStockThreshold: 3 } });
      results.push({ sku, action: existing ? 'updated' : 'added', quantity, newTotal: updated.quantity });
    }
    return { success: true, message: `${results.length} items processed`, results };
  }
}
