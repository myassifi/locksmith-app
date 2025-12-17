import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  item_name?: string;
  sku: string;
  quantity: number;
  cost?: number;
  supplier?: string;
  low_stock_threshold?: number;
  make?: string;
  fcc_id?: string;
}

interface SwipeableInventoryCardProps {
  item: InventoryItem;
  onQuantityChange: (id: string, qty: number) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function SwipeableInventoryCard({ item, onQuantityChange, onEdit, onDelete }: SwipeableInventoryCardProps) {
  const isLowStock = item.quantity <= (item.low_stock_threshold || 3);
  
  return (
    <Card className="relative overflow-hidden mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 mr-2">
            <h3 className="font-semibold text-base line-clamp-1">{item.item_name || 'Unnamed Item'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-normal">
                {item.sku}
              </Badge>
              {isLowStock && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                  Low Stock
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
             <div className="font-semibold">{formatCurrency(item.cost || 0)}</div>
             <div className="text-xs text-muted-foreground">{item.make}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm rounded-md"
              onClick={() => onQuantityChange(item.id, Math.max(0, item.quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-semibold">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm rounded-md"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-muted-foreground/20"
              onClick={() => onEdit(item)}
            >
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {(item.fcc_id || item.supplier) && (
          <div className="mt-3 pt-3 border-t flex gap-3 text-xs text-muted-foreground">
            {item.fcc_id && <span>FCC: {item.fcc_id}</span>}
            {item.supplier && <span>• {item.supplier}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
