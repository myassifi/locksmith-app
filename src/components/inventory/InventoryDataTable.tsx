import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface InventoryDataTableProps {
  data: InventoryItem[];
  showReorderNeed?: boolean;
  onQuantityChange: (id: string, newQuantity: number) => Promise<void>;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => Promise<void>;
}

export function InventoryDataTable({ data, showReorderNeed, onQuantityChange, onEdit, onDelete }: InventoryDataTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Item Name</th>
            <th className="p-3 text-left text-sm font-medium">SKU</th>
            <th className="p-3 text-left text-sm font-medium">Make</th>
            <th className="p-3 text-left text-sm font-medium">Model</th>
            <th className="p-3 text-right text-sm font-medium">Quantity</th>
            {showReorderNeed && (
              <th className="p-3 text-right text-sm font-medium">Need</th>
            )}
            <th className="p-3 text-right text-sm font-medium">Unit Cost</th>
            <th className="p-3 text-left text-sm font-medium">Supplier</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isLowStock = item.quantity <= (item.low_stock_threshold ?? 3);
            const threshold = item.low_stock_threshold ?? 3;
            const reorderNeed = Math.max(0, threshold + 1 - item.quantity);
            return (
              <tr key={item.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.item_name}</span>
                    {item.quantity === 0 ? (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    ) : isLowStock ? (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400">Low Stock</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{item.sku || '-'}</td>
                <td className="p-3 text-sm text-muted-foreground">{item.make || '-'}</td>
                <td className="p-3 text-sm text-muted-foreground">{item.model || '-'}</td>
                <td className="p-3 text-right font-medium">{item.quantity}</td>
                {showReorderNeed && (
                  <td className="p-3 text-right font-medium text-primary">{reorderNeed}</td>
                )}
                <td className="p-3 text-right">{formatCurrency(item.cost || 0)}</td>
                <td className="p-3 text-sm text-muted-foreground">{item.supplier || '-'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
