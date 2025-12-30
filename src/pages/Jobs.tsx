import { useState, useEffect } from 'react';
import { ReceiptDialog } from '@/components/ReceiptDialog';
import { Plus, Search, Edit, Trash2, Calendar, DollarSign, Phone, MapPin, Navigation, Package, TrendingUp, Target, Briefcase, Clock, CheckCircle, AlertCircle, ArrowUpDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { api } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { InventorySelector } from '@/components/InventorySelector';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useJobsSocket } from '@/hooks/useSocket';

interface Job {
  id: string;
  customer_id: string;
  job_type: string;
  vehicle_lock_details?: string;
  price: number;
  miles?: number;
  material_cost?: number;
  profit_margin?: number;
  total_cost?: number;
  job_date: string;
  status: string;
  notes?: string;
  created_at: string;
  customers?: {
    name: string;
    phone?: string;
    address?: string;
  };
  job_inventory?: JobInventoryItem[];
}

interface JobInventoryItem {
  inventory_id: string;
  quantity_used: number;
  unit_cost?: number;
  total_cost?: number;
  inventory?: {
    id: string;
    key_type: string;
    sku: string;
    quantity: number;
    cost?: number;
    category?: string;
    brand?: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

const jobTypes = [
  { value: 'spare_key', label: 'Spare Key' },
  { value: 'all_keys_lost', label: 'All Keys Lost' },
  { value: 'car_unlock', label: 'Car Unlock' },
  { value: 'smart_key_programming', label: 'Smart Key Programming' },
  { value: 'house_rekey', label: 'House Rekey' },
  { value: 'lock_repair', label: 'Lock Repair' },
  { value: 'lock_installation', label: 'Lock Installation' },
  { value: 'other', label: 'Other' }
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];

export default function Jobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date-new' | 'date-old' | 'price-high' | 'price-low' | 'customer'>('date-new');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedJobForReceipt, setSelectedJobForReceipt] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedInventory, setSelectedInventory] = useState<JobInventoryItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    job_type: '',
    vehicle_lock_details: '',
    vehicle_year: '',
    price: '',
    miles: '',
    job_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    loadJobs();
    loadCustomers();

    const handleOpenAdd = () => {
      resetForm();
      setDialogOpen(true);
    };

    window.addEventListener('openAddJob', handleOpenAdd);
    return () => window.removeEventListener('openAddJob', handleOpenAdd);
  }, []);

  // Realtime updates for jobs via Socket.IO
  useJobsSocket(() => {
    loadJobs();
  });

  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true' || newParam === '1') {
      const customerId = searchParams.get('customerId') || searchParams.get('customer');
      resetForm();
      if (customerId) {
        setFormData((prev) => ({ ...prev, customer_id: customerId }));
      }
      setDialogOpen(true);

      // Clear params after opening
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('new');
      nextParams.delete('customerId');
      nextParams.delete('customer');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const loadJobs = async () => {
    try {
      const data = await api.getJobs();

      const mapped: Job[] = (data || []).map((job: any) => ({
        id: job.id,
        customer_id: job.customerId,
        job_type: job.jobType,
        vehicle_lock_details: job.vehicleDetails || '',
        price: job.price ?? 0,
        miles: job.miles ?? 0,
        material_cost: job.materialCost ?? 0,
        profit_margin: undefined,
        total_cost: undefined,
        job_date: job.jobDate,
        status: job.status,
        notes: job.notes || '',
        created_at: job.createdAt,
        customers: job.customer
          ? {
              name: job.customer.name,
              phone: job.customer.phone || undefined,
              address: job.customer.address || undefined,
            }
          : undefined,
      }));

      setJobs(mapped);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      const mapped: Customer[] = (data || []).map((customer: any) => ({
        id: customer.id,
        name: customer.name,
      }));
      setCustomers(mapped);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to manage jobs",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const materialCost = selectedInventory.reduce(
        (sum, item) => sum + (item.total_cost || 0),
        0
      );

      const jobPayload: any = {
        customerId: formData.customer_id,
        jobType: formData.job_type,
        vehicleDetails: formData.vehicle_lock_details || null,
        vehicleYear: formData.vehicle_year || null,
        price: formData.price ? parseFloat(formData.price) : 0,
        miles: formData.miles ? parseFloat(formData.miles) : 0,
        status: formData.status as any,
        jobDate: formData.job_date,
        notes: formData.notes || '',
        materialCost,
      };

      const inventoryPayload = selectedInventory.map((item) => ({
        inventoryItemId: item.inventory_id,
        quantityUsed: item.quantity_used,
      }));

      if (editingJob) {
        await api.updateJob(editingJob.id, {
          ...jobPayload,
          inventory: inventoryPayload,
        });
        toast({ title: 'Success', description: 'Job updated successfully' });
      } else {
        await api.createJob({
          ...jobPayload,
          inventory: inventoryPayload,
        });
        toast({ title: 'Success', description: 'Job created successfully' });
      }
      
      loadJobs();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        title: "Error",
        description: "Failed to save job",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (job: Job) => {
    setEditingJob(job);
    setFormData({
      customer_id: job.customer_id,
      job_type: job.job_type,
      vehicle_lock_details: job.vehicle_lock_details || '',
      vehicle_year: (job as any).vehicle_year || '',
      price: job.price ? job.price.toString() : '',
      miles: job.miles ? job.miles.toString() : '',
      job_date: job.job_date,
      status: job.status,
      notes: job.notes || ''
    });
    setSelectedDate(new Date(job.job_date));

    // Use inventory data already loaded with the job from the API
    if (job.job_inventory && job.job_inventory.length > 0) {
      setSelectedInventory(job.job_inventory);
    } else {
      setSelectedInventory([]);
    }

    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await api.deleteJob(id);

      toast({ title: "Success", description: "Job deleted successfully" });
      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      job_type: '',
      vehicle_lock_details: '',
      vehicle_year: '',
      price: '',
      miles: '',
      job_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      notes: ''
    });
    setSelectedDate(new Date());
    setSelectedInventory([]);
    setEditingJob(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md font-semibold';
      case 'in_progress': 
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 shadow-md font-semibold';
      case 'paid': 
        return 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-md font-semibold';
      case 'pending':
        return 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 shadow-md font-semibold';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-md font-semibold';
      default: 
        return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white border-0 shadow-md font-semibold';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'paid': return '💰';
      case 'pending': return '⏱️';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const handleCallCustomer = (phone: string) => {
    if (phone) {
      const normalized = phone.replace(/[^\d+]/g, '');
      window.location.href = `tel:${normalized}`;
    }
  };

  const handleSMSCustomer = (phone: string, customerName: string, jobType: string) => {
    if (phone) {
      const message = `Hi ${customerName}, this is regarding your ${jobType} service. `;
      const normalized = phone.replace(/[^\d+]/g, '');
      window.location.href = `sms:${normalized}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`;
    }
  };

  const handleGetDirections = (address: string, customerName: string) => {
    if (address) {
      const encodedAddress = encodeURIComponent(`${address} ${customerName}`);
      // Try to open in Google Maps app first, fallback to web
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const formatJobType = (type: string) => {
    return jobTypes.find(jt => jt.value === type)?.label || type;
  };

  // Calculate stats
  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (Number(j.price) || 0), 0);
  const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

  // URL-based filters from Dashboard
  const statusFilter = searchParams.get('status'); // 'pending' | 'in_progress' | 'completed'
  const whenFilter = searchParams.get('when'); // 'today' | 'month' | 'all'

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = (
      job.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.vehicle_lock_details || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = statusFilter ? job.status === statusFilter : true;

    let matchesWhen = true;
    if (whenFilter === 'today') {
      const d = new Date(job.job_date);
      const now = new Date();
      matchesWhen = d.toDateString() === now.toDateString();
    } else if (whenFilter === 'month') {
      const d = new Date(job.job_date);
      const now = new Date();
      matchesWhen = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } // 'all' or missing -> no extra filter

    return matchesSearch && matchesStatus && matchesWhen;
  }).sort((a, b) => {
    // Apply sorting
    switch (sortBy) {
      case 'date-new':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-old':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'price-high':
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case 'price-low':
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case 'customer':
        return (a.customers?.name || '').localeCompare(b.customers?.name || '');
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
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

  return (
    <div className="space-y-6">
      {/* Job Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">All jobs</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingJobs}</div>
            <p className="text-xs text-muted-foreground">To start</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressJobs}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">From completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Job Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgJobValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per job</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-primary">Jobs</h1>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingJob ? 'Edit Job' : 'Add New Job'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_type">Job Type *</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_lock_details">Vehicle/Lock Details</Label>
                  <Input
                    id="vehicle_lock_details"
                    value={formData.vehicle_lock_details}
                    onChange={(e) => setFormData({ ...formData, vehicle_lock_details: e.target.value })}
                    placeholder="e.g., Honda Civic, Front door lock"
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicle_year">Vehicle Year</Label>
                  <Select
                    value={formData.vehicle_year}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: new Date().getFullYear() - 1994 }, (_, i) => {
                        const year = new Date().getFullYear() + 1 - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="miles">Miles</Label>
                  <Input
                    id="miles"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={formData.miles}
                    onChange={(e) => setFormData({ ...formData, miles: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Job Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setFormData({ ...formData, job_date: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Materials/Inventory</Label>
                <InventorySelector
                  jobId={editingJob?.id}
                  selectedItems={selectedInventory}
                  onItemsChange={setSelectedInventory}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingJob ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-new">Newest First</SelectItem>
              <SelectItem value="date-old">Oldest First</SelectItem>
              <SelectItem value="price-high">Price: High-Low</SelectItem>
              <SelectItem value="price-low">Price: Low-High</SelectItem>
              <SelectItem value="customer">Customer A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={!statusFilter ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/90 transition-colors px-3 py-1"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('status');
              setSearchParams(newParams);
            }}
          >
            All Jobs
          </Badge>
          <Badge 
            variant={statusFilter === 'pending' ? "default" : "outline"}
            className="cursor-pointer hover:bg-amber-500 hover:text-white transition-colors px-3 py-1 border-amber-500 text-amber-600 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('status', 'pending');
              setSearchParams(newParams);
            }}
          >
            🟡 Pending ({jobs.filter(j => j.status === 'pending').length})
          </Badge>
          <Badge 
            variant={statusFilter === 'in_progress' ? "default" : "outline"}
            className="cursor-pointer hover:bg-blue-500 hover:text-white transition-colors px-3 py-1 border-blue-500 text-blue-600 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('status', 'in_progress');
              setSearchParams(newParams);
            }}
          >
            🔵 In Progress ({jobs.filter(j => j.status === 'in_progress').length})
          </Badge>
          <Badge 
            variant={statusFilter === 'completed' ? "default" : "outline"}
            className="cursor-pointer hover:bg-green-500 hover:text-white transition-colors px-3 py-1 border-green-500 text-green-600 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('status', 'completed');
              setSearchParams(newParams);
            }}
          >
            🟢 Completed ({jobs.filter(j => j.status === 'completed').length})
          </Badge>
          
          {(statusFilter || whenFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
              className="h-11 sm:h-7 text-sm sm:text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="grid gap-4">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? 'No jobs found matching your search.' : 'No jobs added yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{job.customers?.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{formatJobType(job.job_type)}</p>
                        {job.customers?.address && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.customers.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {job.customers?.phone && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSMSCustomer(job.customers.phone!, job.customers.name, formatJobType(job.job_type))}
                              className="h-11 w-11 sm:h-6 sm:w-6 p-0 text-primary hover:bg-primary/10"
                              title="Send SMS"
                            >
                              <MessageSquare className="h-4 w-4 sm:h-3 sm:w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCallCustomer(job.customers.phone!)}
                              className="h-11 w-11 sm:h-6 sm:w-6 p-0 text-primary hover:bg-primary/10"
                              title="Call"
                            >
                              <Phone className="h-4 w-4 sm:h-3 sm:w-3" />
                            </Button>
                          </>
                        )}
                        {job.customers?.address && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGetDirections(job.customers.address!, job.customers.name)}
                            className="h-11 w-11 sm:h-6 sm:w-6 p-0 text-primary hover:bg-primary/10"
                            title="Directions"
                          >
                            <MapPin className="h-4 w-4 sm:h-3 sm:w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                    <Badge variant="outline" className={getStatusColor(job.status)}>
                      {getStatusIcon(job.status)} {job.status.replace(/_/g, ' ')}
                    </Badge>
                    {job.status !== 'completed' && job.price && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await api.updateJob(job.id, {
                              status: 'completed',
                            });
                            toast({
                              title: 'Job Completed',
                              description: 'Job marked as completed successfully',
                            });
                            loadJobs();
                          } catch (error) {
                            console.error('Error updating job status:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to mark job as completed',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="h-11 sm:h-7 px-3 sm:px-2 text-sm sm:text-xs bg-green-500 hover:bg-green-600 text-white"
                      >
                        Mark Completed
                      </Button>
                    )}
                    {job.status === 'completed' && job.price && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedJobForReceipt(job);
                          setReceiptDialogOpen(true);
                        }}
                        className="h-11 sm:h-8 text-sm sm:text-xs gap-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Send Receipt"
                      >
                        📧 <span className="hidden sm:inline">Receipt</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(job)}
                      className="h-11 w-11 sm:h-9 sm:w-9 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                      className="h-11 w-11 sm:h-9 sm:w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
               <CardContent className="pt-0">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {job.vehicle_lock_details && (
                      <p><span className="font-medium">Details:</span> {job.vehicle_lock_details}</p>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(job.job_date), 'MMM dd, yyyy')}
                    </div>
                    {!!job.miles && job.miles > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Navigation className="h-4 w-4" />
                        {Number(job.miles).toFixed(1)} mi
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                     {/* Pricing Information */}
                     <div className="space-y-1">
                       {job.price && (
                         <div className="flex items-center justify-between">
                           <span className="text-muted-foreground">Price:</span>
                           <span className="font-medium text-green-600">${Number(job.price).toFixed(2)}</span>
                         </div>
                       )}
                       {job.material_cost && job.material_cost > 0 && (
                         <div className="flex items-center justify-between">
                           <span className="text-muted-foreground">Materials:</span>
                           <span className="font-medium text-orange-600">${Number(job.material_cost).toFixed(2)}</span>
                         </div>
                       )}
                       {job.profit_margin !== undefined && job.profit_margin !== null && job.profit_margin > 0 && (
                         <div className="flex items-center justify-between">
                           <span className="text-muted-foreground">Profit:</span>
                           <span className={`font-medium ${job.profit_margin > 50 ? 'text-green-600' : job.profit_margin > 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                             {Number(job.profit_margin).toFixed(1)}%
                           </span>
                         </div>
                       )}
                     </div>
                    
                    {job.customers?.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {job.customers.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Material Usage Summary */}
                {job.material_cost && job.material_cost > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Materials used</span>
                      <Badge variant="outline" className="ml-auto">
                        ${Number(job.material_cost).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                )}
                {job.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{job.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Receipt Dialog */}
      {selectedJobForReceipt && (
        <ReceiptDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          jobData={selectedJobForReceipt}
        />
      )}
    </div>
  );
}