import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ShoppingCart } from 'lucide-react';
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

interface InventoryGridCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => Promise<void>;
}

export function InventoryGridCard({ item, onEdit, onDelete }: InventoryGridCardProps) {
  const isLowStock = item.low_stock_threshold && item.quantity <= item.low_stock_threshold;
  const isOutOfStock = item.quantity === 0;

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-0">
        {/* Image Section */}
        <div className="relative aspect-square bg-muted/30 overflow-hidden">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.item_name || item.sku} 
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-16 w-16 opacity-20" />
            </div>
          )}
          
          {/* Stock Badge */}
          {isOutOfStock ? (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Low Stock
            </Badge>
          ) : null}

          {/* Quick Actions - Show on hover */}
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={() => onEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
            {item.item_name || item.sku}
          </h3>

          {/* Make/Model/Year */}
          {(item.make || item.model) && (
            <p className="text-xs text-muted-foreground">
              {item.year_from && `${item.year_from} - ${item.year_to || 'Present'} `}
              {item.make} {item.model}
            </p>
          )}

          {/* SKU */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SKU:</span>
            <Badge variant="outline" className="text-xs font-mono">
              {item.sku}
            </Badge>
          </div>

          {/* Price & Quantity */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(item.cost || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Unit Price</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-orange-500' : 'text-foreground'}`}>
                {item.quantity}
              </div>
              <div className="text-xs text-muted-foreground">In Stock</div>
            </div>
          </div>

          {/* Additional Info */}
          {(item.fcc_id || item.supplier) && (
            <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
              {item.fcc_id && (
                <div className="flex justify-between">
                  <span>FCC ID:</span>
                  <span className="font-mono">{item.fcc_id}</span>
                </div>
              )}
              {item.supplier && (
                <div className="flex justify-between">
                  <span>Supplier:</span>
                  <span className="truncate ml-2">{item.supplier}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
