import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  item_name: string;
  sku?: string;
  fcc_id?: string;
  make?: string;
  quantity: number;
  unit_cost: number;
  reorder_threshold?: number;
  supplier?: string;
}

interface InventoryDataTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function InventoryDataTable({ items, onEdit, onDelete }: InventoryDataTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Item Name</th>
            <th className="p-3 text-left text-sm font-medium">SKU</th>
            <th className="p-3 text-left text-sm font-medium">Make</th>
            <th className="p-3 text-right text-sm font-medium">Quantity</th>
            <th className="p-3 text-right text-sm font-medium">Unit Cost</th>
            <th className="p-3 text-left text-sm font-medium">Supplier</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isLowStock = item.reorder_threshold && item.quantity <= item.reorder_threshold;
            return (
              <tr key={item.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.item_name}</span>
                    {isLowStock && (
                      <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{item.sku || '-'}</td>
                <td className="p-3 text-sm text-muted-foreground">{item.make || '-'}</td>
                <td className="p-3 text-right font-medium">{item.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
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
