import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Package2, AlertCircle, RefreshCw, X, DollarSign, TrendingUp, Package, ShoppingCart, ArrowUpDown, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { InventoryDataTable } from '@/components/inventory/InventoryDataTable';
import { SwipeableInventoryCard } from '@/components/mobile/SwipeableCard';
import { PageShell } from '@/components/mobile/PageShell';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';

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
  module?: string;
  total_cost_value?: number;
  fcc_id?: string;
  low_stock_threshold?: number;
  year_from?: number;
  year_to?: number;
}

interface FilterState {
  category: string;
  make: string;
  supplier: string;
  priceRange: string;
  stockStatus: string;
  fccId: string;
}

export default function InventoryNew() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'in-stock' | 'reorder'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'quantity-high' | 'quantity-low' | 'cost-high' | 'cost-low' | 'low-stock' | 'recently-added'>('name');
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [duplicateItem, setDuplicateItem] = useState<InventoryItem | null>(null);
  const [duplicateField, setDuplicateField] = useState<'sku' | 'fcc_id' | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    quantity: '',
    supplier: '',
    low_stock_threshold: '',
    action: 'add' as 'add' | 'set' | 'subtract'
  });
  const [searchSuggestions, setSearchSuggestions] = useState<InventoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    make: 'all',
    supplier: 'all',
    priceRange: 'all',
    stockStatus: 'all',
    fccId: '',
  });

  const [formData, setFormData] = useState({
    item_name: '',
    sku: '',
    key_type: '',
    quantity: '',
    cost: '',
    supplier: '',
    category: 'Prox / Smart Keys',
    make: '',
    module: '',
    year_from: '',
    year_to: '',
    fcc_id: '',
    low_stock_threshold: '3',
  });

  // Auto-generate item name
  useEffect(() => {
    if (formData.make && formData.year_from && formData.category) {
      const itemName = `${formData.make} ${formData.year_from} ${formData.category}`;
      setFormData(prev => ({ ...prev, item_name: itemName }));
    }
  }, [formData.make, formData.year_from, formData.category]);

  // Key Categories
  const keyCategories = [
    'Prox / Smart Keys',
    'Remotes',
    'Remote Head Keys (RHK)',
    'Transponder Keys',
    'Fobik Keys',
    'Flip Key',
    'Emergency Blades',
    'Shells / Cases',
    'Other / Tools / Accessories'
  ];

  const suppliers = [
    'Xhorse', 'Autel', 'KeylessFactory', 'Keydiy', 'GTL',
    'JMA', 'Ilco', 'Silca', 'Advanced Keys', 'Keyline'
  ];

  const vehicleMakes = [
    'Toyota', 'Honda', 'Ford', 'GM', 'Chevrolet', 'Hyundai', 'Kia',
    'Lexus', 'Nissan', 'BMW', 'Mercedes', 'Audi', 'Volkswagen',
    'Subaru', 'Mazda', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln',
    'Jeep', 'Dodge', 'Chrysler', 'Ram', 'Universal'
  ];

  const availableYears = Array.from(
    { length: new Date().getFullYear() + 2 - 1995 },
    (_, i) => 1995 + i
  );

  // Real-time updates
  useRealtimeUpdates({
    table: 'inventory',
    onInsert: () => loadInventory(),
    onUpdate: () => loadInventory(),
    onDelete: () => loadInventory(),
    showNotifications: true
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('sku');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate inventory stats
  const inventoryStats = useMemo(() => {
    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * (item.cost || 0));
    }, 0);
    
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const avgCost = inventory.length > 0 
      ? inventory.reduce((sum, item) => sum + (item.cost || 0), 0) / inventory.length 
      : 0;
    
    return {
      totalValue,
      totalItems,
      avgCost,
      uniqueSkus: inventory.length,
      lowStock: inventory.filter(i => i.quantity <= (i.low_stock_threshold || 3) && i.quantity > 0).length,
      outOfStock: inventory.filter(i => i.quantity === 0).length,
    };
  }, [inventory]);

  // Filter and search logic
  const filteredInventory = useMemo(() => {
    let filtered = [...inventory];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_name?.toLowerCase().includes(search) ||
        item.sku?.toLowerCase().includes(search) ||
        item.fcc_id?.toLowerCase().includes(search) ||
        item.supplier?.toLowerCase().includes(search) ||
        item.make?.toLowerCase().includes(search)
      );
    }

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => {
        const threshold = item.low_stock_threshold || 3;
        if (activeTab === 'low') return item.quantity <= threshold && item.quantity > 0;
        if (activeTab === 'out') return item.quantity === 0;
        if (activeTab === 'in-stock') return item.quantity > threshold;
        if (activeTab === 'reorder') {
          // Smart reorder logic: items at or below threshold OR out of stock
          return item.quantity <= threshold;
        }
        return true;
      });
    }

    // Advanced filters
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }
    if (filters.make !== 'all') {
      filtered = filtered.filter(item => item.make === filters.make);
    }
    if (filters.supplier !== 'all') {
      filtered = filtered.filter(item => item.supplier === filters.supplier);
    }
    if (filters.fccId.trim()) {
      filtered = filtered.filter(item =>
        item.fcc_id?.toLowerCase().includes(filters.fccId.toLowerCase())
      );
    }
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.cost) return filters.priceRange === 'none';
        const cost = item.cost;
        if (filters.priceRange === 'low') return cost < 10;
        if (filters.priceRange === 'medium') return cost >= 10 && cost <= 50;
        if (filters.priceRange === 'high') return cost > 50;
        return true;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.item_name || a.sku).localeCompare(b.item_name || b.sku));
        break;
      case 'quantity-high':
        filtered.sort((a, b) => b.quantity - a.quantity);
        break;
      case 'quantity-low':
        filtered.sort((a, b) => a.quantity - b.quantity);
        break;
      case 'cost-high':
        filtered.sort((a, b) => (b.cost || 0) - (a.cost || 0));
        break;
      case 'cost-low':
        filtered.sort((a, b) => (a.cost || 0) - (b.cost || 0));
        break;
      case 'low-stock':
        filtered.sort((a, b) => {
          const aThreshold = a.low_stock_threshold || 3;
          const bThreshold = b.low_stock_threshold || 3;
          const aRatio = a.quantity / aThreshold;
          const bRatio = b.quantity / bThreshold;
          return aRatio - bRatio;
        });
        break;
      case 'recently-added':
        filtered.sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate; // Most recent first
        });
        break;
    }

    return filtered;
  }, [inventory, searchTerm, activeTab, filters, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const lowStockItems = inventory.filter(i => i.quantity <= (i.low_stock_threshold || 3) && i.quantity > 0);
    const outOfStockItems = inventory.filter(i => i.quantity === 0);
    const reorderItems = inventory.filter(i => i.quantity <= (i.low_stock_threshold || 3));
    
    return {
      all: inventory.length,
      low: lowStockItems.length,
      out: outOfStockItems.length,
      inStock: inventory.filter(i => i.quantity > (i.low_stock_threshold || 3)).length,
      reorder: reorderItems.length,
    };
  }, [inventory]);

  // Get unique values for filters
  const uniqueSuppliers = useMemo(() => 
    [...new Set(inventory.map(i => i.supplier).filter(Boolean))],
    [inventory]
  );
  
  const uniqueMakes = useMemo(() =>
    [...new Set(inventory.map(i => i.make).filter(Boolean))],
    [inventory]
  );
  
  const uniqueCategories = useMemo(() =>
    [...new Set(inventory.map(i => i.category).filter(Boolean))],
    [inventory]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.make !== 'all') count++;
    if (filters.supplier !== 'all') count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.fccId.trim()) count++;
    return count;
  }, [filters]);

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Quantity updated",
      });
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      sku: item.sku,
      key_type: item.key_type || '',
      quantity: item.quantity.toString(),
      cost: item.cost?.toString() || '',
      supplier: item.supplier || '',
      category: item.category || 'Prox / Smart Keys',
      make: item.make || '',
      module: item.module || '',
      year_from: item.year_from?.toString() || '',
      year_to: item.year_to?.toString() || '',
      fcc_id: item.fcc_id || '',
      low_stock_threshold: (item.low_stock_threshold || 3).toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item deleted",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final duplicate check before submission
    if (!editingItem && duplicateItem) {
      toast({
        title: "Duplicate Detected",
        description: `An item with this ${duplicateField === 'sku' ? 'SKU' : 'FCC ID'} already exists. Please update the existing item instead.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const itemData = {
        item_name: formData.item_name || null,
        sku: formData.sku,
        key_type: formData.key_type,
        quantity: parseInt(formData.quantity),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        supplier: formData.supplier || null,
        category: formData.category,
        make: formData.make || null,
        module: formData.module || null,
        year_from: formData.year_from ? parseInt(formData.year_from) : null,
        year_to: formData.year_to ? parseInt(formData.year_to) : null,
        fcc_id: formData.fcc_id || null,
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        user_id: user?.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated" });
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([itemData]);

        if (error) throw error;
        toast({ title: "Success", description: "Item added" });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setDuplicateItem(null);
    setDuplicateField(null);
    setFormData({
      item_name: '',
      sku: '',
      key_type: '',
      quantity: '',
      cost: '',
      supplier: '',
      category: 'Prox / Smart Keys',
      make: '',
      module: '',
      year_from: '',
      year_to: '',
      fcc_id: '',
      low_stock_threshold: '3',
    });
  };

  // Check for duplicate SKU or FCC ID in real-time
  const checkForDuplicate = (field: 'sku' | 'fcc_id', value: string) => {
    if (!value.trim()) {
      setDuplicateItem(null);
      setDuplicateField(null);
      return;
    }

    const duplicate = inventory.find(item => {
      // Skip the item being edited
      if (editingItem && item.id === editingItem.id) return false;
      
      if (field === 'sku') {
        return item.sku.toLowerCase() === value.toLowerCase();
      } else {
        return item.fcc_id?.toLowerCase() === value.toLowerCase();
      }
    });

    if (duplicate) {
      setDuplicateItem(duplicate);
      setDuplicateField(field);
    } else {
      setDuplicateItem(null);
      setDuplicateField(null);
    }
  };

  // Handle updating existing item instead of creating duplicate
  const handleUpdateExisting = () => {
    if (duplicateItem) {
      handleEdit(duplicateItem);
      setDuplicateItem(null);
      setDuplicateField(null);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      make: 'all',
      supplier: 'all',
      priceRange: 'all',
      stockStatus: 'all',
      fccId: '',
    });
  };

  // Bulk edit functions
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map(item => item.id));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedItems.length === 0) return;

    try {
      const updates = selectedItems.map(async (id) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;

        const updateData: any = {};

        // Handle quantity update
        if (bulkEditData.quantity) {
          const qty = parseInt(bulkEditData.quantity);
          if (bulkEditData.action === 'add') {
            updateData.quantity = item.quantity + qty;
          } else if (bulkEditData.action === 'subtract') {
            updateData.quantity = Math.max(0, item.quantity - qty);
          } else {
            updateData.quantity = qty;
          }
        }

        // Handle supplier update
        if (bulkEditData.supplier) {
          updateData.supplier = bulkEditData.supplier;
        }

        // Handle threshold update
        if (bulkEditData.low_stock_threshold) {
          updateData.low_stock_threshold = parseInt(bulkEditData.low_stock_threshold);
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id);
          
          if (error) throw error;
        }
      });

      await Promise.all(updates);
      
      toast({
        title: "Success",
        description: `Updated ${selectedItems.length} items`,
      });

      setBulkEditDialogOpen(false);
      setSelectedItems([]);
      setBulkEditMode(false);
      setBulkEditData({ quantity: '', supplier: '', low_stock_threshold: '', action: 'add' });
      await loadInventory();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive"
      });
    }
  };

  // Search suggestions with fuzzy matching
  const updateSearchSuggestions = (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const search = query.toLowerCase();
    const matches = inventory
      .filter(item => 
        item.item_name?.toLowerCase().includes(search) ||
        item.sku?.toLowerCase().includes(search) ||
        item.fcc_id?.toLowerCase().includes(search) ||
        item.make?.toLowerCase().includes(search) ||
        item.supplier?.toLowerCase().includes(search)
      )
      .slice(0, 5); // Limit to 5 suggestions

    setSearchSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleRefresh = async () => {
    await loadInventory();
    toast({
      title: 'Refreshed',
      description: 'Inventory data updated',
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = ['Item Name', 'SKU', 'Category', 'Make', 'Year', 'Quantity', 'Cost', 'Total Value', 'Supplier', 'FCC ID'];
      const rows = filteredInventory.map(item => [
        item.item_name || '',
        item.sku,
        item.category || '',
        item.make || '',
        item.year_from ? `${item.year_from}${item.year_to ? `-${item.year_to}` : ''}` : '',
        item.quantity,
        item.cost?.toFixed(2) || '0.00',
        ((item.quantity * (item.cost || 0)).toFixed(2)),
        item.supplier || '',
        item.fcc_id || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Inventory exported to CSV',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export inventory',
        variant: 'destructive'
      });
    }
  };

  return (
    <PageShell
      title="Inventory"
      subtitle="Smart Inventory Management"
      actions={
        <>
          {bulkEditMode && selectedItems.length > 0 ? (
            <>
              <Badge variant="secondary" className="gap-1">
                {selectedItems.length} selected
              </Badge>
              <Button
                variant="default"
                size="sm"
                onClick={() => setBulkEditDialogOpen(true)}
                className="gap-2 touch-target"
              >
                <Package className="h-4 w-4" />
                Bulk Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedItems([]);
                  setBulkEditMode(false);
                }}
                className="touch-target"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={bulkEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setBulkEditMode(!bulkEditMode);
                  setSelectedItems([]);
                }}
                className="gap-2 touch-target"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="gap-2 touch-target"
                disabled={inventory.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                className="touch-target"
                aria-label="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <InventoryFilters
                filters={filters}
                onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
                onReset={clearFilters}
                suppliers={uniqueSuppliers}
                makes={uniqueMakes}
                categories={uniqueCategories}
              />
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 touch-target">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </>
          )}
        </>
      }
      tabs={
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryStats.totalItems}</div>
                <p className="text-xs text-muted-foreground">In stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${inventoryStats.totalValue.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Inventory worth</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{inventoryStats.lowStock}</div>
                <p className="text-xs text-muted-foreground">Need reorder</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <Package2 className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</div>
                <p className="text-xs text-muted-foreground">Need ordering</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${inventoryStats.avgCost.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Per item</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique SKUs</CardTitle>
                <ShoppingCart className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryStats.uniqueSkus}</div>
                <p className="text-xs text-muted-foreground">Total items</p>
              </CardContent>
            </Card>
          </div>

          {/* Reorder Suggestions Banner */}
          {activeTab === 'reorder' && filteredInventory.length > 0 && (
            <Alert className="border-primary bg-primary/10 dark:bg-primary/20">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div className="flex items-center justify-between flex-1">
                <div>
                  <AlertTitle className="text-primary">Reorder Suggestions</AlertTitle>
                  <AlertDescription className="text-primary/80">
                    {filteredInventory.length} item{filteredInventory.length > 1 ? 's' : ''} need{filteredInventory.length === 1 ? 's' : ''} reordering based on stock thresholds.
                    {inventoryStats.outOfStock > 0 && ` ${inventoryStats.outOfStock} completely out of stock.`}
                  </AlertDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Export reorder list
                      const reorderList = filteredInventory.map(item => ({
                        sku: item.sku,
                        name: item.item_name || item.sku,
                        current: item.quantity,
                        threshold: item.low_stock_threshold || 3,
                        supplier: item.supplier || 'N/A',
                        cost: item.cost || 0
                      }));
                      const csv = [
                        ['SKU', 'Item Name', 'Current Qty', 'Threshold', 'Supplier', 'Unit Cost'],
                        ...reorderList.map(i => [i.sku, i.name, i.current, i.threshold, i.supplier, i.cost])
                      ].map(row => row.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `reorder-list-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      toast({ title: 'Success', description: 'Reorder list exported' });
                    }}
                    className="bg-white dark:bg-gray-800"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export List
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Low Stock Alert Banner */}
          {activeTab !== 'reorder' && inventoryStats.lowStock > 0 && showLowStockAlert && (
            <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="flex items-center justify-between flex-1">
                <div>
                  <AlertTitle className="text-amber-900 dark:text-amber-100">Low Stock Alert</AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {inventoryStats.lowStock} item{inventoryStats.lowStock > 1 ? 's' : ''} need reordering. 
                    {inventoryStats.outOfStock > 0 && ` ${inventoryStats.outOfStock} out of stock.`}
                  </AlertDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('low')}
                    className="bg-white dark:bg-gray-800"
                  >
                    View Items
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLowStockAlert(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Search Bar & Sort */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Search by name, SKU, FCC ID, supplier..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  updateSearchSuggestions(value);
                }}
                onFocus={() => {
                  if (searchTerm) updateSearchSuggestions(searchTerm);
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="pl-10 h-9 touch-target"
              />
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchSuggestions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        setSearchTerm(item.item_name || item.sku);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item_name || 'Unnamed Item'}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          {item.fcc_id && (
                            <p className="text-xs text-muted-foreground">FCC: {item.fcc_id}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={item.quantity <= (item.low_stock_threshold || 3) ? 'destructive' : 'secondary'}>
                            Qty: {item.quantity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px] sm:w-[180px] h-9">
                <ArrowUpDown className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="recently-added">Recently Added</SelectItem>
                <SelectItem value="quantity-high">Qty: High-Low</SelectItem>
                <SelectItem value="quantity-low">Qty: Low-High</SelectItem>
                <SelectItem value="cost-high">Cost: High-Low</SelectItem>
                <SelectItem value="cost-low">Cost: Low-High</SelectItem>
                <SelectItem value="low-stock">Low Stock First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.category !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Category: {filters.category}
                  <X className="h-3 w-3 cursor-pointer touch-target" onClick={() => setFilters({ ...filters, category: 'all' })} />
                </Badge>
              )}
              {filters.make !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Make: {filters.make}
                  <X className="h-3 w-3 cursor-pointer touch-target" onClick={() => setFilters({ ...filters, make: 'all' })} />
                </Badge>
              )}
              {filters.supplier !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Supplier: {filters.supplier}
                  <X className="h-3 w-3 cursor-pointer touch-target" onClick={() => setFilters({ ...filters, supplier: 'all' })} />
                </Badge>
              )}
              {filters.fccId && (
                <Badge variant="secondary" className="gap-1">
                  FCC ID: {filters.fccId}
                  <X className="h-3 w-3 cursor-pointer touch-target" onClick={() => setFilters({ ...filters, fccId: '' })} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="touch-target">
                Clear all
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto grid grid-cols-5">
              <TabsTrigger value="all" className="gap-2 touch-target">
                All <Badge variant="secondary" className="ml-1">{stats.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="reorder" className="gap-2 touch-target">
                <ShoppingCart className="h-3 w-3" />
                Reorder <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400">{stats.reorder}</Badge>
              </TabsTrigger>
              <TabsTrigger value="low" className="gap-2 touch-target">
                Low <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400">{stats.low}</Badge>
              </TabsTrigger>
              <TabsTrigger value="out" className="gap-2 touch-target">
                Out <Badge variant="destructive" className="ml-1">{stats.out}</Badge>
              </TabsTrigger>
              <TabsTrigger value="in-stock" className="gap-2 touch-target">
                In Stock <Badge variant="secondary" className="ml-1">{stats.inStock}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    >
      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {searchTerm || activeFiltersCount > 0 ? (
            <>
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No items match your filters</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); clearFilters(); }} className="touch-target">
                Clear all filters
              </Button>
            </>
          ) : (
            <>
              <Package2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No inventory items yet</h3>
              <p className="text-muted-foreground mb-4">Add your first item to get started</p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 touch-target">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Bulk Edit Mode: Select All */}
          {bulkEditMode && filteredInventory.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedItems.length === filteredInventory.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                {selectedItems.length === filteredInventory.length ? 'Deselect All' : 'Select All'}
                {selectedItems.length > 0 && ` (${selectedItems.length} selected)`}
              </span>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <InventoryDataTable
              data={filteredInventory}
              onQuantityChange={handleQuantityChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Mobile Card View with Swipe Actions */}
          <div className="space-y-3 lg:hidden">
            {filteredInventory.map((item) => (
              <SwipeableInventoryCard
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          
          {/* Duplicate Warning Banner */}
          {!editingItem && duplicateItem && (
            <Alert variant="destructive" className="animate-in slide-in-from-top">
              <AlertTriangle className="h-5 w-5" />
              <div className="flex-1">
                <AlertTitle>Duplicate {duplicateField === 'sku' ? 'SKU' : 'FCC ID'} Detected!</AlertTitle>
                <AlertDescription>
                  An item with this {duplicateField === 'sku' ? 'SKU' : 'FCC ID'} already exists:
                  <div className="mt-2 p-2 bg-background rounded border">
                    <p className="font-medium">{duplicateItem.item_name || 'Unnamed Item'}</p>
                    <p className="text-sm text-muted-foreground">SKU: {duplicateItem.sku}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {duplicateItem.quantity}</p>
                  </div>
                </AlertDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUpdateExisting}
                className="ml-2"
              >
                Update Existing
              </Button>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label>Item Name (Auto-generated)</Label>
                  <Input
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g., Honda 2010 Automotive Keys"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Generated from Make + Year + Category</p>
                </div>

                <div>
                  <Label>SKU *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, sku: value });
                      checkForDuplicate('sku', value);
                    }}
                    required
                    placeholder="e.g., XNFO01EN"
                    className={duplicateField === 'sku' ? 'border-destructive' : ''}
                  />
                  {duplicateField === 'sku' && duplicateItem && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      SKU already exists: {duplicateItem.item_name || duplicateItem.sku}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {keyCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Chip Type</Label>
                  <Input
                    value={formData.key_type}
                    onChange={(e) => setFormData({ ...formData, key_type: e.target.value })}
                    placeholder="e.g., 4C, 4D, 46"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label>Low Stock Threshold</Label>
                  <Input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label>Make *</Label>
                  <Select value={formData.make} onValueChange={(value) => setFormData({ ...formData, make: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleMakes.map(make => (
                        <SelectItem key={make} value={make}>{make}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Year From *</Label>
                    <Select value={formData.year_from} onValueChange={(value) => setFormData({ ...formData, year_from: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year To</Label>
                    <Select value={formData.year_to} onValueChange={(value) => setFormData({ ...formData, year_to: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>FCC ID</Label>
                  <Input
                    value={formData.fcc_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, fcc_id: value });
                      if (value.trim()) {
                        checkForDuplicate('fcc_id', value);
                      }
                    }}
                    placeholder="e.g., 2AATX-XKHY01EN"
                    className={duplicateField === 'fcc_id' ? 'border-destructive' : ''}
                  />
                  {duplicateField === 'fcc_id' && duplicateItem && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      FCC ID already exists: {duplicateItem.item_name || duplicateItem.sku}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Supplier</Label>
                  <Select value={formData.supplier} onValueChange={(value) => setFormData({ ...formData, supplier: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 touch-target">
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="touch-target">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItems.length} Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Changes will be applied to all {selectedItems.length} selected items.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Quantity Action</Label>
              <Select 
                value={bulkEditData.action} 
                onValueChange={(value: 'add' | 'set' | 'subtract') => 
                  setBulkEditData({ ...bulkEditData, action: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to current quantity</SelectItem>
                  <SelectItem value="set">Set to specific quantity</SelectItem>
                  <SelectItem value="subtract">Subtract from current</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity {bulkEditData.action === 'add' ? '(Add)' : bulkEditData.action === 'subtract' ? '(Subtract)' : '(Set To)'}</Label>
              <Input
                type="number"
                value={bulkEditData.quantity}
                onChange={(e) => setBulkEditData({ ...bulkEditData, quantity: e.target.value })}
                placeholder="Leave empty to skip"
                min="0"
              />
            </div>

            <div>
              <Label>Supplier (Optional)</Label>
              <Select 
                value={bulkEditData.supplier} 
                onValueChange={(value) => setBulkEditData({ ...bulkEditData, supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to update supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Don't change</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Low Stock Threshold (Optional)</Label>
              <Input
                type="number"
                value={bulkEditData.low_stock_threshold}
                onChange={(e) => setBulkEditData({ ...bulkEditData, low_stock_threshold: e.target.value })}
                placeholder="Leave empty to skip"
                min="0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setBulkEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkUpdate}
                className="flex-1"
                disabled={!bulkEditData.quantity && !bulkEditData.supplier && !bulkEditData.low_stock_threshold}
              >
                Update {selectedItems.length} Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Action Button for Quick Add */}
      {!bulkEditMode && (
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg lg:hidden bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-95 touch-target"
          size="icon"
          aria-label="Quick Add Item"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </PageShell>
  );
}
