import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User, History, DollarSign, Users as UsersIcon, TrendingUp, Award, PhoneCall, Send, Navigation, ArrowUpDown, Star, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCard } from '@/components/LoadingSpinner';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { format } from 'date-fns';
import { ActivityLogger } from '@/lib/activityLogger';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  total_jobs?: number;
  total_revenue?: number;
  last_job_date?: string;
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'revenue' | 'jobs' | 'name'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'vip' | 'active' | 'new' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { isLoading, executeAsync } = useErrorHandler();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Real-time updates
  useRealtimeUpdates({
    table: 'customers',
    onInsert: () => loadCustomers(),
    onUpdate: () => loadCustomers(),
    onDelete: () => loadCustomers(),
    showNotifications: true
  });

  const loadCustomers = async () => {
    await executeAsync(async () => {
      // Get basic customer data first
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Get job statistics for each customer
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          // Get job count and revenue for this customer
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('price, created_at, status')
            .eq('customer_id', customer.id);

          const totalJobs = jobsData?.length || 0;
          const completedJobs = jobsData?.filter(job => job.status === 'completed') || [];
          const totalRevenue = completedJobs.reduce((sum, job) => sum + (Number(job.price) || 0), 0);
          const lastJobDate = jobsData && jobsData.length > 0 
            ? jobsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
            : null;

          return {
            ...customer,
            total_jobs: totalJobs,
            total_revenue: totalRevenue,
            last_job_date: lastJobDate
          };
        })
      );

      setCustomers(customersWithStats);
      setFilteredCustomers(customersWithStats);
      return true;
    }, {
      errorMessage: "Failed to load customers"
    });
  };

  // Enhanced search, sort, and filter functionality
  useEffect(() => {
    applyFiltersAndSort();
  }, [customers, searchTerm, sortBy, filterBy]);

  const applyFiltersAndSort = () => {
    let result = [...customers];

    // Apply search
    if (searchTerm.trim()) {
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    switch (filterBy) {
      case 'vip':
        result = result.filter(c => (c.total_revenue || 0) > 500);
        break;
      case 'active':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        result = result.filter(c => c.last_job_date && new Date(c.last_job_date) > threeMonthsAgo);
        break;
      case 'new':
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        result = result.filter(c => new Date(c.created_at) > oneMonthAgo);
        break;
      case 'inactive':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        result = result.filter(c => !c.last_job_date || new Date(c.last_job_date) < sixMonthsAgo);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'revenue':
        result.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
        break;
      case 'jobs':
        result.sort((a, b) => (b.total_jobs || 0) - (a.total_jobs || 0));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredCustomers(result);
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };

  const viewCustomerHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await executeAsync(async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerJobs(data || []);
      setHistoryDialogOpen(true);
      return true;
    }, {
      errorMessage: "Failed to load customer job history"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to manage customers",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        // Log activity
        ActivityLogger.customerUpdated(formData.name, editingCustomer.id);
        
        toast({ title: "Success", description: "Customer updated successfully" });
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([{ ...formData, user_id: user.id }])
          .select();

        if (error) throw error;
        
        // Log activity
        if (data && data[0]) {
          ActivityLogger.customerCreated(formData.name, data[0].id);
        }
        
        toast({ title: "Success", description: "Customer created successfully" });
      }
      
      loadCustomers();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Find customer name before deletion
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log activity
      ActivityLogger.customerDeleted(customer.name);
      
      toast({ title: "Success", description: "Customer deleted successfully" });
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setEditingCustomer(null);
  };

  // Remove duplicate filteredCustomers as it's handled by handleSearch

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please log in to manage customers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const vipCustomers = customers.filter(c => (c.total_revenue || 0) > 500).length;
  const topCustomer = customers.reduce((max, c) => 
    (c.total_revenue || 0) > (max.total_revenue || 0) ? c : max
  , customers[0]);

  return (
    <div className="space-y-6">
      {/* Customer Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active customer base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">From all customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgCustomerValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipCustomers}</div>
            <p className="text-xs text-muted-foreground">Over $500 revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-primary">Customers</h1>
          
          <div className="flex items-center gap-2 flex-wrap">
            <SearchBar
              placeholder="Search customers..."
              onSearch={handleSearch}
              onClear={() => handleSearch('')}
              className="max-w-xs"
            />
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="revenue">Revenue ↓</SelectItem>
                <SelectItem value="jobs">Jobs ↓</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filterBy === 'all' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/90 transition-colors px-3 py-1"
            onClick={() => setFilterBy('all')}
          >
            All Customers
          </Badge>
          <Badge
            variant={filterBy === 'vip' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-purple-500 hover:text-white transition-colors px-3 py-1 border-purple-500 text-purple-600"
            onClick={() => setFilterBy('vip')}
          >
            ⭐ VIP ({customers.filter(c => (c.total_revenue || 0) > 500).length})
          </Badge>
          <Badge
            variant={filterBy === 'active' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-green-500 hover:text-white transition-colors px-3 py-1 border-green-500 text-green-600"
            onClick={() => setFilterBy('active')}
          >
            ✓ Active ({customers.filter(c => {
              const threeMonthsAgo = new Date();
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              return c.last_job_date && new Date(c.last_job_date) > threeMonthsAgo;
            }).length})
          </Badge>
          <Badge
            variant={filterBy === 'new' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-blue-500 hover:text-white transition-colors px-3 py-1 border-blue-500 text-blue-600"
            onClick={() => setFilterBy('new')}
          >
            ✨ New ({customers.filter(c => {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(c.created_at) > oneMonthAgo;
            }).length})
          </Badge>
          <Badge
            variant={filterBy === 'inactive' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-amber-500 hover:text-white transition-colors px-3 py-1 border-amber-500 text-amber-600"
            onClick={() => setFilterBy('inactive')}
          >
            ⏰ Inactive ({customers.filter(c => {
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              return !c.last_job_date || new Date(c.last_job_date) < sixMonthsAgo;
            }).length})
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCustomer ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Search is now in the header */}

      {/* Customers List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? 'No customers found matching your search.' : 'No customers added yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer, index) => (
            <Card key={customer.id} className={`hover-lift glass-card fade-in`} style={{animationDelay: `${index * 100}ms`}}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {customer.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewCustomerHistory(customer)}
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                      title="Edit Customer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(customer.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete Customer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/jobs/new?customer=${customer.id}`}
                    className="flex-1 min-w-[120px] gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="text-xs">New Job</span>
                  </Button>
                  {customer.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `tel:${customer.phone}`}
                      className="gap-1"
                      title="Call Customer"
                    >
                      <PhoneCall className="h-3 w-3" />
                    </Button>
                  )}
                  {customer.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `mailto:${customer.email}`}
                      className="gap-1"
                      title="Email Customer"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  )}
                  {customer.address && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address || '')}`, '_blank')}
                      className="gap-1"
                      title="Get Directions"
                    >
                      <Navigation className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Business Intelligence Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-primary">{customer.total_jobs || 0}</div>
                    <div className="text-xs text-muted-foreground">Jobs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-green-600">${(customer.total_revenue || 0).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">
                      {customer.last_job_date ? format(new Date(customer.last_job_date), 'MMM dd') : 'Never'}
                    </div>
                    <div className="text-xs text-muted-foreground">Last Job</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start gap-2 text-muted-foreground hover:text-primary transition-colors">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline cursor-pointer"
                      >
                        {customer.address}
                      </a>
                    </div>
                  )}
                  
                  {/* Customer Segment Badges */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {(customer.total_revenue || 0) > 1000 && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        <Star className="h-3 w-3 mr-1" />
                        VIP
                      </Badge>
                    )}
                    {(customer.total_revenue || 0) > 500 && (customer.total_revenue || 0) <= 1000 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <DollarSign className="h-3 w-3 mr-1" />
                        High Value
                      </Badge>
                    )}
                    {(() => {
                      const oneMonthAgo = new Date();
                      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                      return new Date(customer.created_at) > oneMonthAgo;
                    })() && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        <Sparkles className="h-3 w-3 mr-1" />
                        New
                      </Badge>
                    )}
                    {(() => {
                      const sixMonthsAgo = new Date();
                      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                      return !customer.last_job_date || new Date(customer.last_job_date) < sixMonthsAgo;
                    })() && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  
                  {customer.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">{customer.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Customer History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Job History - {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {customerJobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No jobs found for this customer.</p>
            ) : (
              customerJobs.map((job, index) => (
                <Card key={job.id} className={`slide-up`} style={{animationDelay: `${index * 50}ms`}}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{job.job_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(job.job_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                        {job.price && (
                          <p className="text-sm font-medium mt-1">${Number(job.price).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    {job.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{job.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}