import { needsReorder, reorderQuantity } from '@/lib/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, KeyRound } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  item_name?: string;
  sku: string;
  key_type: string;
  quantity: number;
  cost?: number;
  supplier?: string;
  category?: string;
  make?: string;
  model?: string;
  module?: string;
  total_cost_value?: number;
  fcc_id?: string;
  low_stock_threshold?: number;
  year_from?: number;
  year_to?: number;
  created_at?: string;
}

interface InventoryGridCardProps {
  item: InventoryItem;
  showReorderNeed?: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => Promise<void>;
}

export function InventoryGridCard({ item, showReorderNeed, onEdit, onDelete }: InventoryGridCardProps) {
  const low = needsReorder(item);
  const out = item.quantity === 0;
  const title = item.item_name || item.sku || 'Unnamed item';
  return (
    <Card className="h-full overflow-hidden border shadow-none transition-colors hover:border-primary/40">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div>
          <Badge variant="outline" className={out ? 'text-destructive border-destructive/30' : low ? 'text-amber-700 border-amber-300 dark:text-amber-400' : 'text-emerald-700 border-emerald-200 dark:text-emerald-400'}>{out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}</Badge>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{item.category || 'Uncategorized'}</p>
          <h3 className="mt-1 text-base font-semibold leading-snug break-words min-h-12">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{[item.make, item.model, item.year_from ? `${item.year_from}${item.year_to ? `–${item.year_to}` : '+'}` : ''].filter(Boolean).join(' · ') || 'Universal / no vehicle specified'}</p>
        </div>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">SKU</dt><dd className="font-mono text-right break-all">{item.sku || '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground shrink-0">FCC ID</dt><dd className="font-mono text-right break-all">{item.fcc_id || '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Supplier</dt><dd className="text-right break-words">{item.supplier || '—'}</dd></div>
        </dl>
        <div className="grid grid-cols-2 border-y py-3">
          <div><p className="text-xs text-muted-foreground">On hand</p><p className={`text-2xl font-semibold tabular-nums ${out ? 'text-destructive' : ''}`}>{item.quantity}<span className="ml-1 text-xs font-normal text-muted-foreground">units</span></p></div>
          <div className="text-right"><p className="text-xs text-muted-foreground">Unit cost</p><p className="text-xl font-semibold tabular-nums">{formatCurrency(item.cost || 0)}</p></div>
        </div>
        {showReorderNeed && <p className="text-xs text-muted-foreground">Order {reorderQuantity(item)} to get above the low-stock threshold.</p>}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 h-11 gap-2" onClick={() => onEdit(item)}><Edit className="h-4 w-4" />Edit item</Button>
          <Button variant="ghost" className="h-11 w-11 text-muted-foreground hover:text-destructive" aria-label={`Delete ${title}`} onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
