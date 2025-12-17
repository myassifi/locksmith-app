import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface InventoryFiltersProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  filterBy: string;
  onFilterChange: (value: string) => void;
}

export function InventoryFilters({ sortBy, onSortChange, filterBy, onFilterChange }: InventoryFiltersProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Label>Sort By</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="quantity-low">Quantity (Low to High)</SelectItem>
            <SelectItem value="quantity-high">Quantity (High to Low)</SelectItem>
            <SelectItem value="cost-low">Cost (Low to High)</SelectItem>
            <SelectItem value="cost-high">Cost (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label>Filter</Label>
        <Select value={filterBy} onValueChange={onFilterChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
