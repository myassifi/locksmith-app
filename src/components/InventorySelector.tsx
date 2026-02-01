import { useState, useEffect } from 'react';
import { Plus, Minus, X, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

interface InventoryItem {
  id: string;
  item_name?: string;
  sku: string;
  key_type: string;
  quantity: number;
  cost?: number;
  category?: string;
  make?: string;
  module?: string;
  fcc_id?: string;
}

interface JobInventoryItem {
  inventory_id: string;
  quantity_used: number;
  unit_cost?: number;
  total_cost?: number;
  inventory?: {
    id: string;
    sku: string;
    key_type: string;
    quantity: number;
    cost?: number;
    category?: string;
    brand?: string;
  };
}

interface InventorySelectorProps {
  jobId?: string;
  selectedItems: JobInventoryItem[];
  onItemsChange: (items: JobInventoryItem[]) => void;
}

export function InventorySelector({ jobId, selectedItems, onItemsChange }: InventorySelectorProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [newItemData, setNewItemData] = useState({
    itemName: '',
    sku: '',
    keyType: '',
    make: '',
    module: '',
    fccId: '',
    quantity: '1',
    cost: '',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory();
      const mapped: InventoryItem[] = (data || [])
        .filter((item: any) => (item.quantity ?? 0) > 0)
        .sort((a: any, b: any) => (a.keyType || '').localeCompare(b.keyType || ''))
        .map((item: any) => ({
          id: item.id,
          item_name: item.itemName || item.sku || '',
          sku: item.sku || '',
          key_type: item.keyType || '',
          quantity: item.quantity ?? 0,
          cost: item.cost ?? 0,
          category: item.category || '',
          make: item.make || '',
          module: item.module || '',
          fcc_id: item.fccId || '',
        }));
      setInventory(mapped);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = (item: InventoryItem) => {
    const existingItem = selectedItems.find(si => si.inventory_id === item.id);
    
    if (existingItem) {
      // Increase quantity if already selected
      updateQuantity(item.id, existingItem.quantity_used + 1);
    } else {
      // Add new item
      const newItem: JobInventoryItem = {
        inventory_id: item.id,
        quantity_used: 1,
        unit_cost: item.cost || 0,
        total_cost: item.cost || 0,
        inventory: item
      };
      onItemsChange([...selectedItems, newItem]);
    }
  };

  const updateQuantity = (inventoryId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(inventoryId);
      return;
    }

    const updatedItems = selectedItems.map(item => {
      if (item.inventory_id === inventoryId) {
        const unitCost = item.unit_cost || 0;
        return {
          ...item,
          quantity_used: newQuantity,
          total_cost: unitCost * newQuantity
        };
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const removeItem = (inventoryId: string) => {
    onItemsChange(selectedItems.filter(item => item.inventory_id !== inventoryId));
  };

  const filteredInventory = inventory.filter(item =>
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.key_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fcc_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const safeName = (newItemData.itemName || newItemData.sku).trim();
    if (!safeName) {
      toast({
        title: 'Missing name',
        description: 'Please enter an item name (or at least a SKU).',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseInt(newItemData.quantity || '0', 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast({
        title: 'Invalid quantity',
        description: 'Quantity must be at least 1 so it can be used on this job.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingNewItem(true);
    try {
      const created = await api.createInventoryItem({
        itemName: safeName,
        sku: newItemData.sku.trim() || null,
        keyType: newItemData.keyType.trim() || null,
        make: newItemData.make.trim() || null,
        module: newItemData.module.trim() || null,
        fccId: newItemData.fccId.trim() || null,
        quantity,
        cost: newItemData.cost ? parseFloat(newItemData.cost) : 0,
      });

      const createdForSelector: InventoryItem = {
        id: created.id,
        item_name: created.item_name || created.itemName || created.sku || '',
        sku: created.sku || '',
        key_type: created.key_type || created.keyType || '',
        quantity: created.quantity ?? 0,
        cost: created.cost ?? 0,
        category: created.category || '',
        make: created.make || '',
        module: created.module || '',
        fcc_id: created.fcc_id || created.fccId || '',
      };

      await loadInventory();
      addInventoryItem(createdForSelector);

      setNewItemDialogOpen(false);
      setNewItemData({
        itemName: '',
        sku: '',
        keyType: '',
        make: '',
        module: '',
        fccId: '',
        quantity: '1',
        cost: '',
      });

      toast({
        title: 'Success',
        description: 'Material added to inventory and added to this job.',
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create inventory item',
        variant: 'destructive',
      });
    } finally {
      setCreatingNewItem(false);
    }
  };

  const totalMaterialCost = selectedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Materials Used
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Inventory Items</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Material</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateNewItem} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new_item_name">Item Name *</Label>
                        <Input
                          id="new_item_name"
                          value={newItemData.itemName}
                          onChange={(e) => setNewItemData((p) => ({ ...p, itemName: e.target.value }))}
                          placeholder="e.g., Toyota Smart Key"
                          required={false}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="new_item_sku">SKU</Label>
                          <Input
                            id="new_item_sku"
                            value={newItemData.sku}
                            onChange={(e) => setNewItemData((p) => ({ ...p, sku: e.target.value }))}
                            placeholder="SKU"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_item_key_type">Key Type</Label>
                          <Input
                            id="new_item_key_type"
                            value={newItemData.keyType}
                            onChange={(e) => setNewItemData((p) => ({ ...p, keyType: e.target.value }))}
                            placeholder="Prox / Smart"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="new_item_make">Make</Label>
                          <Input
                            id="new_item_make"
                            value={newItemData.make}
                            onChange={(e) => setNewItemData((p) => ({ ...p, make: e.target.value }))}
                            placeholder="Toyota"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_item_module">Module</Label>
                          <Input
                            id="new_item_module"
                            value={newItemData.module}
                            onChange={(e) => setNewItemData((p) => ({ ...p, module: e.target.value }))}
                            placeholder="(optional)"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_item_fcc">FCC ID</Label>
                        <Input
                          id="new_item_fcc"
                          value={newItemData.fccId}
                          onChange={(e) => setNewItemData((p) => ({ ...p, fccId: e.target.value }))}
                          placeholder="FCC ID"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="new_item_qty">Quantity *</Label>
                          <Input
                            id="new_item_qty"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={newItemData.quantity}
                            onChange={(e) => setNewItemData((p) => ({ ...p, quantity: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_item_cost">Cost</Label>
                          <Input
                            id="new_item_cost"
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={newItemData.cost}
                            onChange={(e) => setNewItemData((p) => ({ ...p, cost: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={creatingNewItem}>
                          {creatingNewItem ? 'Saving...' : 'Save & Add'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setNewItemDialogOpen(false)}
                          disabled={creatingNewItem}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8">Loading inventory...</div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No items found matching search.' : 'No inventory items available.'}
                  </div>
                ) : (
                  filteredInventory.map((item) => {
                    const selectedItem = selectedItems.find(si => si.inventory_id === item.id);
                    const isSelected = !!selectedItem;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={`cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => addInventoryItem(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{item.item_name || item.sku}</h4>
                                {item.make && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.make}
                                  </Badge>
                                )}
                                {item.module && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.module}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                {item.fcc_id && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    FCC: {item.fcc_id}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  Available: {item.quantity}
                                </p>
                              </div>
                              {item.cost && (
                                <p className="text-sm font-medium text-primary">
                                  ${item.cost.toFixed(2)} each
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <Badge variant="secondary" className="ml-2">
                                Selected: {selectedItem.quantity_used}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Items */}
      <div className="space-y-2">
        {selectedItems.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No materials selected. Click "Add Material" to get started.
            </CardContent>
          </Card>
        ) : (
          selectedItems.map((item) => (
            <Card key={item.inventory_id} className="bg-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{(item.inventory as any)?.item_name || item.inventory?.sku}</h4>
                    {(item.inventory as any)?.fcc_id && (
                      <p className="text-xs text-muted-foreground font-mono">
                        FCC: {(item.inventory as any).fcc_id}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.inventory_id, item.quantity_used - 1)}
                        className="h-11 w-11 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity_used}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.inventory_id, item.quantity_used + 1)}
                        className="h-11 w-11 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-medium">${(item.total_cost || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${(item.unit_cost || 0).toFixed(2)} each
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.inventory_id)}
                      className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Cost Summary */}
      {selectedItems.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium">Total Material Cost</span>
              </div>
              <span className="text-lg font-bold text-primary">
                ${totalMaterialCost.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}