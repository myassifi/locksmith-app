import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Minus } from 'lucide-react';
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
  image_url?: string;
  created_at?: string;
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
        <div className="flex gap-3">
          {/* Image Thumbnail */}
          <div className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.item_name} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground bg-muted/50">
                No img
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 mr-2 min-w-0">
                <h3 className="font-semibold text-base truncate">{item.item_name || 'Unnamed Item'}</h3>
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
              <div className="text-right flex-shrink-0">
                 <div className="font-semibold">{formatCurrency(item.cost || 0)}</div>
                 <div className="text-xs text-muted-foreground">{item.make} {item.model}</div>
              </div>
            </div>
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
