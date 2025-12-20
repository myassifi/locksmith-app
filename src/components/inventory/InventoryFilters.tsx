import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter } from 'lucide-react';

interface FilterState {
  category: string;
  make: string;
  supplier: string;
  priceRange: string;
  stockStatus: string;
  fccId: string;
}

interface InventoryFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  suppliers: string[];
  makes: string[];
  categories: string[];
}

export function InventoryFilters({ 
  filters, 
  onFilterChange, 
  onReset,
  suppliers,
  makes,
  categories
}: InventoryFiltersProps) {
  const activeCount = [
    filters.category, 
    filters.make, 
    filters.supplier, 
    filters.priceRange, 
    filters.stockStatus
  ].filter(v => v !== 'all').length + (filters.fccId ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 touch-target">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-[1.25rem]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Filters</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReset}
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          </div>
          
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select 
              value={filters.category} 
              onValueChange={(value) => onFilterChange({ category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Make</Label>
            <Select 
              value={filters.make} 
              onValueChange={(value) => onFilterChange({ make: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Makes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {makes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Supplier</Label>
            <Select 
              value={filters.supplier} 
              onValueChange={(value) => onFilterChange({ supplier: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Price Range</Label>
            <Select 
              value={filters.priceRange} 
              onValueChange={(value) => onFilterChange({ priceRange: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="low">Low (&lt; $10)</SelectItem>
                <SelectItem value="medium">Medium ($10 - $50)</SelectItem>
                <SelectItem value="high">High (&gt; $50)</SelectItem>
                <SelectItem value="none">No Cost Set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>FCC ID</Label>
            <Input 
              placeholder="Filter by FCC ID..." 
              value={filters.fccId}
              onChange={(e) => onFilterChange({ fccId: e.target.value })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
