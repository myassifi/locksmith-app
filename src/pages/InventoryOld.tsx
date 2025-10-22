import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Minus, Filter, X, SlidersHorizontal, TrendingUp, DollarSign, Clock, BarChart3, Bell, Archive, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCard } from '@/components/LoadingSpinner';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { ActivityLogger } from '@/lib/activityLogger';
import { Download } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  key_type: string;
  quantity: number;
  cost?: number;
  supplier?: string;
  created_at: string;
  category?: string;
  make?: string;
  module?: string;
  usage_count?: number;
  last_used_date?: string;
  total_cost_value?: number;
  year_from?: number;
  year_to?: number;
  fcc_id?: string;
}

interface FilterState {
  category: string;
  make: string;
  module: string;
  stockStatus: string;
  supplier: string;
  priceRange: string;
  year: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface InventoryStats {
  totalValue: number;
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryCounts: Record<string, number>;
  topUsedItems: InventoryItem[];
}

export default function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalValue: 0,
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    categoryCounts: {},
    topUsedItems: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { isLoading, executeAsync } = useErrorHandler();
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    make: 'all',
    module: 'all',
    stockStatus: 'all',
    supplier: 'all',
    priceRange: 'all',
    year: 'all',
    sortBy: 'key_type',
    sortOrder: 'asc'
  });
  const [formData, setFormData] = useState({
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
    fcc_id: ''
  });

  // Auto-generate item name based on make, year, and category
  useEffect(() => {
    if (formData.make && formData.year_from && formData.category) {
      const itemName = `${formData.make} ${formData.year_from} ${formData.category}`;
      setFormData(prev => ({ ...prev, sku: itemName }));
    }
  }, [formData.make, formData.year_from, formData.category]);

  // Real-time updates
  useRealtimeUpdates({
    table: 'inventory',
    onInsert: () => loadInventory(),
    onUpdate: () => loadInventory(),
    onDelete: () => loadInventory(),
    showNotifications: true
  });

  // Key Categories for locksmith business
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


  const modules = [
    'ECU',
    'BCM',
    'Smart Module',
    'Immobilizer',
    'N/A'
  ];

  const suppliers = [
    'Xhorse',
    'Autel',
    'KeylessFactory',
    'Keydiy',
    'GTL',
    'JMA',
    'Ilco',
    'Silca',
    'Advanced Keys',
    'Keyline'
  ];

  // Vehicle make/model data
  const vehicleData = {
    'Toyota': ['Camry', 'Corolla', 'Prius', 'RAV4', 'Highlander', 'Sienna', 'Tacoma', 'Tundra', 'Sequoia', '4Runner'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'HR-V', 'Passport', 'Ridgeline', 'Insight'],
    'Ford': ['F-150', 'Escape', 'Explorer', 'Edge', 'Fusion', 'Focus', 'Mustang', 'Transit', 'Expedition'],
    'GM': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Tahoe', 'Suburban', 'Impala', 'Cruze'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Tahoe', 'Suburban', 'Impala', 'Cruze'],
    'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Venue', 'Palisade', 'Genesis'],
    'Kia': ['Optima', 'Forte', 'Sportage', 'Sorento', 'Soul', 'Rio', 'Stinger', 'Telluride'],
    'Lexus': ['ES', 'RX', 'NX', 'GX', 'LX', 'IS', 'GS', 'LS', 'LC'],
    'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano', 'Titan', 'Frontier', 'Armada'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'i3', 'i8'],
    'Mercedes': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'A-Class'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8'],
    'Volkswagen': ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf', 'Arteon'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'Legacy', 'Ascent', 'Crosstrek'],
    'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'CX-30', 'MX-5 Miata'],
    'Acura': ['TLX', 'RDX', 'MDX', 'ILX', 'NSX'],
    'Infiniti': ['Q50', 'Q60', 'QX50', 'QX60', 'QX80'],
    'Cadillac': ['Escalade', 'XT5', 'XT6', 'CT5', 'CT6'],
    'Lincoln': ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'Continental'],
    'Jeep': ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator'],
    'Dodge': ['Charger', 'Challenger', 'Durango', 'Journey'],
    'Chrysler': ['Pacifica', '300'],
    'Ram': ['1500', '2500', '3500'],
    'Universal': ['Universal']
  };

  const availableYears = Array.from({ length: new Date().getFullYear() + 2 - 1995 }, (_, i) => 1995 + i);

  const exportToCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to export data",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('inventory-export', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Inventory exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export inventory data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    if (!user) return;
    
    await executeAsync(async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('key_type');

      if (error) throw error;
      setInventory(data || []);
      calculateStats(data || []);
      applyFilters(data || [], searchTerm, filters);
      return true;
    }, {
      errorMessage: "Failed to load inventory"
    });
  };

  const calculateStats = (items: InventoryItem[]) => {
    const stats: InventoryStats = {
      totalValue: items.reduce((sum, item) => sum + (item.total_cost_value || 0), 0),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStockCount: items.filter(item => item.quantity <= 3 && item.quantity > 0).length,
      outOfStockCount: items.filter(item => item.quantity === 0).length,
      categoryCounts: {},
      topUsedItems: items
        .filter(item => item.usage_count && item.usage_count > 0)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5)
    };

    // Calculate category counts
    items.forEach(item => {
      const category = item.category || 'General';
      stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
    });

    setInventoryStats(stats);
  };

  // Enhanced filtering system
  const applyFilters = (items: InventoryItem[], search: string, currentFilters: FilterState) => {
    let filtered = items;

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(item =>
        item.key_type.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(search.toLowerCase()) ||
        item.make?.toLowerCase().includes(search.toLowerCase()) ||
        item.module?.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter
    if (currentFilters.category !== 'all') {
      filtered = filtered.filter(item => item.category === currentFilters.category);
    }

    // Make filter
    if (currentFilters.make !== 'all') {
      filtered = filtered.filter(item => item.make === currentFilters.make);
    }

    // Module filter
    if (currentFilters.module !== 'all') {
      filtered = filtered.filter(item => item.module === currentFilters.module);
    }

    // Stock status filter
    if (currentFilters.stockStatus !== 'all') {
      filtered = filtered.filter(item => {
        const isLow = item.quantity <= 3; // Fixed low stock threshold
        const isOut = item.quantity === 0;
        
        switch (currentFilters.stockStatus) {
          case 'low': return isLow && !isOut;
          case 'out': return isOut;
          case 'good': return !isLow;
          default: return true;
        }
      });
    }

    // Supplier filter
    if (currentFilters.supplier !== 'all') {
      filtered = filtered.filter(item => item.supplier === currentFilters.supplier);
    }

    // Price range filter
    if (currentFilters.priceRange !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.cost) return currentFilters.priceRange === 'none';
        const cost = item.cost;
        
        switch (currentFilters.priceRange) {
          case 'low': return cost < 10;
          case 'medium': return cost >= 10 && cost <= 50;
          case 'high': return cost > 50;
          case 'none': return false;
          default: return true;
        }
      });
    }

    // Year filter
    if (currentFilters.year !== 'all') {
      filtered = filtered.filter(item => {
        const targetYear = parseInt(currentFilters.year);
        
        // If item has no year range, include it only in 'no-year' filter
        if (!item.year_from && !item.year_to) {
          return currentFilters.year === 'no-year';
        }
        
        // If item has year range, check if target year falls within it
        if (item.year_from && item.year_to) {
          return targetYear >= item.year_from && targetYear <= item.year_to;
        }
        
        // If only year_from is specified, check if target year is >= year_from
        if (item.year_from && !item.year_to) {
          return targetYear >= item.year_from;
        }
        
        // If only year_to is specified, check if target year is <= year_to
        if (!item.year_from && item.year_to) {
          return targetYear <= item.year_to;
        }
        
        return false;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let valueA: any = a[currentFilters.sortBy as keyof InventoryItem];
      let valueB: any = b[currentFilters.sortBy as keyof InventoryItem];

      if (currentFilters.sortBy === 'cost') {
        valueA = valueA || 0;
        valueB = valueB || 0;
      }

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (currentFilters.sortOrder === 'desc') {
        return valueA < valueB ? 1 : -1;
      }
      return valueA > valueB ? 1 : -1;
    });

    setFilteredInventory(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    applyFilters(inventory, query, filters);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    applyFilters(inventory, searchTerm, updatedFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      category: 'all',
      make: 'all',
      module: 'all',
      stockStatus: 'all',
      supplier: 'all',
      priceRange: 'all',
      year: 'all',
      sortBy: 'key_type',
      sortOrder: 'asc'
    };
    setFilters(defaultFilters);
    setSearchTerm('');
    applyFilters(inventory, '', defaultFilters);
  };

  const getUniqueSuppliers = () => {
    const suppliers = inventory
      .map(item => item.supplier)
      .filter(Boolean)
      .filter((supplier, index, array) => array.indexOf(supplier) === index);
    return suppliers;
  };

  const getUniqueMakes = () => {
    const makes = inventory
      .map(item => item.make)
      .filter(Boolean)
      .filter((make, index, array) => array.indexOf(make) === index);
    return makes;
  };

  const getUniqueModules = () => {
    const modules = inventory
      .map(item => item.module)
      .filter(Boolean)
      .filter((module, index, array) => array.indexOf(module) === index);
    return modules;
  };

  const getUniqueYears = () => {
    const years = new Set<number>();
    inventory.forEach(item => {
      if (item.year_from) years.add(item.year_from);
      if (item.year_to) years.add(item.year_to);
      
      // Add all years in the range
      if (item.year_from && item.year_to) {
        for (let year = item.year_from; year <= item.year_to; year++) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  };

  const getVehicleCompatibility = (item: InventoryItem) => {
    if (!item.make) return '';
    
    let compatibility = item.make;
    if (item.year_from && item.year_to) {
      compatibility += ` (${item.year_from}–${item.year_to})`;
    } else if (item.year_from) {
      compatibility += ` (${item.year_from}+)`;
    } else if (item.year_to) {
      compatibility += ` (up to ${item.year_to})`;
    }
    
    return compatibility;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.make !== 'all') count++;
    if (filters.module !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.supplier !== 'all') count++;
    if (filters.priceRange !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  // Usage tracking function
  const recordUsage = async (itemId: string, quantityUsed: number, jobId?: string, notes?: string) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      const { error } = await supabase
        .from('inventory_usage')
        .insert([{
          inventory_id: itemId,
          job_id: jobId,
          quantity_used: quantityUsed,
          cost_per_unit: item.cost,
          total_cost: (item.cost || 0) * quantityUsed,
          notes,
          user_id: user.id
        }]);

      if (error) throw error;

      // Update inventory quantity
      const newQuantity = Math.max(0, item.quantity - quantityUsed);
      await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      toast({ 
        title: "Usage Recorded", 
        description: `Used ${quantityUsed} of ${item.key_type}` 
      });
      
      loadInventory();
    } catch (error) {
      console.error('Error recording usage:', error);
      toast({
        title: "Error",
        description: "Failed to record usage",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to manage inventory",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const itemData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        year_from: formData.year_from ? parseInt(formData.year_from) : null,
        year_to: formData.year_to ? parseInt(formData.year_to) : null,
        total_cost_value: formData.cost ? parseFloat(formData.cost) * parseInt(formData.quantity) : 0,
        user_id: user.id
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        
        ActivityLogger.inventoryUpdated(
          formData.key_type,
          itemData.quantity,
          editingItem.id,
          editingItem.quantity
        );
        
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        const { data, error } = await supabase
          .from('inventory')
          .insert([itemData])
          .select();

        if (error) throw error;
        
        if (data && data[0]) {
          ActivityLogger.inventoryAdded(
            formData.key_type,
            itemData.quantity,
            data[0].id
          );
        }
        
        toast({ title: "Success", description: "Item added successfully" });
      }
      
      loadInventory();
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate key') 
          ? "SKU already exists" 
          : "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      key_type: item.key_type,
      quantity: item.quantity.toString(),
      cost: item.cost ? item.cost.toString() : '',
      supplier: item.supplier || '',
      category: item.category || 'General',
      make: item.make || '',
      module: item.module || '',
      year_from: item.year_from ? item.year_from.toString() : '',
      year_to: item.year_to ? item.year_to.toString() : '',
      fcc_id: (item as any).fcc_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const item = inventory.find(item => item.id === id);
    if (!item) return;
    
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      ActivityLogger.inventoryDeleted(item.key_type);
      
      toast({ title: "Success", description: "Item deleted successfully" });
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const adjustQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const item = inventory.find(item => item.id === id);
    if (!item) return;
    
    const quantityChange = newQuantity - item.quantity;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
      
      ActivityLogger.inventoryAdjusted(
        item.key_type,
        quantityChange,
        newQuantity,
        id
      );
      
      loadInventory();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      key_type: '',
      quantity: '',
      cost: '',
      supplier: '',
      category: 'Automotive Keys',
      make: '',
      module: '',
      year_from: '',
      year_to: '',
      fcc_id: ''
    });
    setEditingItem(null);
  };

  const isLowStock = (item: InventoryItem) => {
    return item.quantity <= 3 && item.quantity > 0;
  };

  const lowStockItems = inventory.filter(isLowStock);

  // Smart Alerts
  const getSmartAlerts = () => {
    const alerts = [];
    
    // Low stock alerts
    if (inventoryStats.lowStockCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${inventoryStats.lowStockCount} items need restocking`,
        count: inventoryStats.lowStockCount
      });
    }
    
    // Out of stock alerts
    if (inventoryStats.outOfStockCount > 0) {
      alerts.push({
        type: 'error',
        title: 'Out of Stock',
        message: `${inventoryStats.outOfStockCount} items are completely out of stock`,
        count: inventoryStats.outOfStockCount
      });
    }
    
    // High value inventory alert
    if (inventoryStats.totalValue > 10000) {
      alerts.push({
        type: 'info',
        title: 'High Value Inventory',
        message: `Your inventory is valued at $${inventoryStats.totalValue.toFixed(2)}`,
        count: 1
      });
    }

    return alerts;
  };


  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please log in to manage inventory.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 fade-in">
        <h1 className="mobile-heading font-bold">Inventory</h1>
        <div className="mobile-grid">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Smart Alerts Dashboard */}
      {getSmartAlerts().length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getSmartAlerts().map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.type === 'error' ? 'border-l-destructive' : 
              alert.type === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bell className={`h-4 w-4 ${
                    alert.type === 'error' ? 'text-destructive' : 
                    alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <h3 className="font-semibold">{alert.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inventory Value Tracking Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-green-600">
                  ${inventoryStats.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold text-blue-600">
                  {inventoryStats.totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-yellow-600">
                  {inventoryStats.lowStockCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold text-purple-600">
                  {Object.keys(inventoryStats.categoryCounts).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced header with filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0">
            <h1 className="mobile-heading font-bold text-primary">Smart Inventory Management</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline">{inventory.length} Items</Badge>
              <Badge variant="outline">{filteredInventory.length} Showing</Badge>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()} Filters</Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={exportToCSV}
              variant="outline"
              className="gap-2 w-full sm:w-auto responsive-btn touch-target"
            >
              <Download className="h-4 w-4" />
              <span className="sm:inline">Export CSV</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto responsive-btn touch-target">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">Add Item</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto" aria-describedby="inventory-form-description">
                <DialogHeader>
                  <DialogTitle className="mobile-text">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </DialogTitle>
                  <p id="inventory-form-description" className="text-sm text-muted-foreground">
                    {editingItem ? 'Update the details of this inventory item.' : 'Add a new item to your inventory with details like SKU, category, and pricing.'}
                  </p>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Basic Information */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                        
                        <div>
                          <Label htmlFor="sku" className="mobile-text">Item name *</Label>
                          <Input
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            required
                            placeholder="e.g., Honda 2010 Flip Key"
                            className="touch-target"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category" className="mobile-text">Category *</Label>
                            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                              <SelectTrigger className="touch-target">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {keyCategories.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="key_type" className="mobile-text">Chip Type *</Label>
                            <Input
                              id="key_type"
                              value={formData.key_type}
                              onChange={(e) => setFormData({ ...formData, key_type: e.target.value })}
                              required
                              placeholder="e.g., 4C, 4D, 46, 48, 8A/H-Chip, AES, DST80"
                              className="touch-target"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="quantity" className="mobile-text">Quantity *</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="0"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              required
                              className="touch-target"
                            />
                          </div>

                          <div>
                            <Label htmlFor="cost" className="mobile-text">Cost *</Label>
                            <Input
                              id="cost"
                              type="number"
                              step="0.01"
                              value={formData.cost}
                              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                              required
                              placeholder="0.00"
                              className="touch-target"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="fcc_id" className="mobile-text">FCC ID</Label>
                          <Input
                            id="fcc_id"
                            value={formData.fcc_id}
                            onChange={(e) => setFormData({ ...formData, fcc_id: e.target.value })}
                            placeholder="e.g., 2AATX-XKHY01EN"
                            className="touch-target"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Vehicle & Technical Details */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vehicle Details</h3>
                        
                        <div>
                          <Label htmlFor="make" className="mobile-text">Make *</Label>
                          <Select 
                            value={formData.make} 
                            onValueChange={(value) => setFormData({ ...formData, make: value, module: '' })}
                          >
                            <SelectTrigger className="touch-target">
                              <SelectValue placeholder="Select make" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(vehicleData).map(make => (
                                <SelectItem key={make} value={make}>{make}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="module" className="mobile-text">Model</Label>
                          <Select 
                            value={formData.module} 
                            onValueChange={(value) => setFormData({ ...formData, module: value })}
                            disabled={!formData.make}
                          >
                            <SelectTrigger className="touch-target">
                              <SelectValue placeholder={formData.make ? "Select model" : "Select make first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData.make && vehicleData[formData.make as keyof typeof vehicleData]?.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="year_from" className="mobile-text">Year From *</Label>
                            <Select 
                              value={formData.year_from} 
                              onValueChange={(value) => setFormData({ ...formData, year_from: value })}
                            >
                              <SelectTrigger className="touch-target">
                                <SelectValue placeholder="Start year" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableYears.map(year => (
                                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="year_to" className="mobile-text">Year To *</Label>
                            <Select 
                              value={formData.year_to} 
                              onValueChange={(value) => setFormData({ ...formData, year_to: value })}
                            >
                              <SelectTrigger className="touch-target">
                                <SelectValue placeholder="End year" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableYears.map(year => (
                                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Technical Details</h3>
                        
                        <div>
                          <Label htmlFor="supplier" className="mobile-text">Supplier</Label>
                          <Select 
                            value={formData.supplier} 
                            onValueChange={(value) => {
                              if (value === 'add_new') {
                                // Handle adding new supplier here
                                const newSupplier = prompt('Enter new supplier name:');
                                if (newSupplier) {
                                  setFormData({ ...formData, supplier: newSupplier });
                                }
                              } else {
                                setFormData({ ...formData, supplier: value });
                              }
                            }}
                          >
                            <SelectTrigger className="touch-target">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map(supplier => (
                                <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                              ))}
                              <SelectItem value="add_new" className="text-primary font-medium">
                                + Add Supplier
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                    <Button type="submit" className="flex-1 touch-target responsive-btn">
                      {editingItem ? 'Update Item' : 'Save Item'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      className="touch-target responsive-btn"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* Advanced Filter Panel */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:max-w-md">
            <SearchBar
              placeholder="Search by SKU, type, or supplier..."
              onSearch={handleSearch}
              onClear={() => handleSearch('')}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="gap-2 touch-target">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                 </Button>
               </DrawerTrigger>
               <DrawerContent className="h-[80vh]">
                 <DrawerHeader>
                   <DrawerTitle>Advanced Filters</DrawerTitle>
                 </DrawerHeader>
                 <div className="p-4 space-y-6 overflow-y-auto">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label>Category</Label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange({ category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {keyCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>

                    <div>
                      <Label>Make</Label>
                    <Select value={filters.make} onValueChange={(value) => handleFilterChange({ make: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Makes</SelectItem>
                        {getUniqueMakes().map(make => (
                          <SelectItem key={make} value={make!}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>

                    <div>
                      <Label>Module</Label>
                    <Select value={filters.module} onValueChange={(value) => handleFilterChange({ module: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {getUniqueModules().map(module => (
                          <SelectItem key={module} value={module!}>{module}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>

                    <div>
                      <Label>Supplier</Label>
                    <Select value={filters.supplier} onValueChange={(value) => handleFilterChange({ supplier: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {getUniqueSuppliers().map(supplier => (
                          <SelectItem key={supplier} value={supplier!}>{supplier}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>

                    <div>
                      <Label>Price Range</Label>
                    <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange({ priceRange: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="low">Under $10</SelectItem>
                        <SelectItem value="medium">$10 - $50</SelectItem>
                        <SelectItem value="high">Over $50</SelectItem>
                        <SelectItem value="none">No Price Set</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                    <div>
                      <Label>Year</Label>
                    <Select value={filters.year} onValueChange={(value) => handleFilterChange({ year: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="no-year">No Year Specified</SelectItem>
                        {getUniqueYears().map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Sort By</Label>
                    <div className="flex gap-2">
                      <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="key_type">Key Type</SelectItem>
                          <SelectItem value="sku">SKU</SelectItem>
                          <SelectItem value="quantity">Quantity</SelectItem>
                          <SelectItem value="cost">Price</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilterChange({ 
                          sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                        })}
                        className="px-3"
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={clearFilters} variant="outline" className="flex-1">
                      Clear All
                    </Button>
                    <DrawerClose asChild>
                      <Button className="flex-1">Apply</Button>
                    </DrawerClose>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="touch-target">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" onClick={() => handleFilterChange({ stockStatus: 'all' })}>
              All ({inventory.length})
            </TabsTrigger>
            <TabsTrigger value="low" onClick={() => handleFilterChange({ stockStatus: 'low' })}>
              Low Stock ({lowStockItems.length})
            </TabsTrigger>
            <TabsTrigger value="out" onClick={() => handleFilterChange({ stockStatus: 'out' })}>
              Out ({inventory.filter(item => item.quantity === 0).length})
            </TabsTrigger>
            <TabsTrigger value="good" onClick={() => handleFilterChange({ stockStatus: 'good' })}>
              In Stock ({inventory.filter(item => item.quantity > 3).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Inventory Grid */}
      <div className="mobile-grid">
        {filteredInventory.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="responsive-card text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mobile-text">
                {searchTerm || getActiveFiltersCount() > 0 
                  ? 'No items found matching your criteria.' 
                  : 'No inventory items added yet.'}
              </p>
              {(searchTerm || getActiveFiltersCount() > 0) && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredInventory.map((item, index) => (
            <Card 
              key={item.id} 
              className={`hover-lift glass-card fade-in ${isLowStock(item) ? 'border-destructive' : ''}`}
              style={{animationDelay: `${index * 100}ms`}}
            >
              <CardHeader className="pb-3 responsive-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      {/* Item Name */}
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Item name:</span>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <span className="truncate">{item.sku}</span>
                          {item.quantity === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Out of stock
                            </Badge>
                          )}
                          {isLowStock(item) && item.quantity > 0 && (
                            <AlertTriangle className="h-4 w-4 text-destructive animate-pulse flex-shrink-0" />
                          )}
                        </CardTitle>
                      </div>
                      
                      {/* FCC ID */}
                      {item.fcc_id && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">FCC ID: {item.fcc_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setUsageDialogOpen(true);
                      }}
                      className="touch-target h-8 w-8 p-0"
                      title="Record Usage"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="touch-target h-8 w-8 p-0"
                      title="Edit Item"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive hover:text-destructive touch-target h-8 w-8 p-0"
                      title="Delete Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 responsive-card">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 0}
                        className="touch-target h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge 
                        variant={isLowStock(item) ? "destructive" : "secondary"}
                        className="min-w-[3rem] text-center"
                      >
                        {item.quantity}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(item.id, item.quantity + 1)}
                        className="touch-target h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {item.cost && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unit Cost:</span>
                      <span className="font-medium text-green-600">${Number(item.cost).toFixed(2)}</span>
                    </div>
                  )}

                  {item.total_cost_value && item.total_cost_value > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-bold text-green-600">${Number(item.total_cost_value).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Usage Tracking Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md" aria-describedby="usage-description">
          <DialogHeader>
            <DialogTitle>Record Usage - {selectedItem?.key_type}</DialogTitle>
            <p id="usage-description" className="text-sm text-muted-foreground">
              Track when inventory items are used in jobs. This will automatically reduce your stock count.
            </p>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const quantity = parseInt(formData.get('quantity') as string);
            const notes = formData.get('notes') as string;
            
            if (selectedItem && quantity > 0) {
              recordUsage(selectedItem.id, quantity, undefined, notes);
              setUsageDialogOpen(false);
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity Used *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={selectedItem?.quantity || 1}
                required
                placeholder="Enter quantity used"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {selectedItem?.quantity || 0}
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Job details, customer, etc."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Record Usage</Button>
              <Button type="button" variant="outline" onClick={() => setUsageDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}