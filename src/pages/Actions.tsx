import { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Package, 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Clock,
  Filter,
  Search,
  Calendar,
  User,
  RefreshCw,
  ArrowUpDown,
  Download,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCard } from '@/components/LoadingSpinner';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id?: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description: string;
  metadata?: any;
  created_at: string;
}

interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  customersAdded: number;
  jobsCreated: number;
  inventoryUpdates: number;
  recentActivities: ActivityLog[];
}

export default function Actions() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    todayActivities: 0,
    customersAdded: 0,
    jobsCreated: 0,
    inventoryUpdates: 0,
    recentActivities: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'type' | 'action'>('recent');
  const { isLoading, executeAsync } = useErrorHandler();

  // Real-time updates for activities
  useRealtimeUpdates({
    table: 'activities',
    onInsert: () => loadActivities(),
    showNotifications: false
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    await executeAsync(async () => {
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const activities = activitiesData || [];
      setActivities(activities);
      setFilteredActivities(activities);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayActivities = activities.filter(activity => 
        new Date(activity.created_at) >= today
      );

      const customersAdded = activities.filter(activity => 
        activity.entity_type === 'customer' && activity.action_type === 'create'
      );

      const jobsCreated = activities.filter(activity => 
        activity.entity_type === 'job' && activity.action_type === 'create'
      );

      const inventoryUpdates = activities.filter(activity => 
        activity.entity_type === 'inventory'
      );

      setStats({
        totalActivities: activities.length,
        todayActivities: todayActivities.length,
        customersAdded: customersAdded.length,
        jobsCreated: jobsCreated.length,
        inventoryUpdates: inventoryUpdates.length,
        recentActivities: activities.slice(0, 5)
      });

      return true;
    }, {
      errorMessage: "Failed to load activities"
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, filterType, filterPeriod);
  };

  const handleFilterType = (type: string) => {
    setFilterType(type);
    applyFilters(searchQuery, type, filterPeriod);
  };

  const handleFilterPeriod = (period: string) => {
    setFilterPeriod(period);
    applyFilters(searchQuery, filterType, period);
  };

  const applyFilters = (query: string, type: string, period: string) => {
    let filtered = [...activities];

    // Filter by action type
    if (filterAction !== 'all') {
      filtered = filtered.filter(activity => activity.action_type === filterAction);
    }

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(query.toLowerCase()) ||
        activity.entity_name?.toLowerCase().includes(query.toLowerCase()) ||
        activity.action_type.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by activity type
    if (type !== 'all') {
      filtered = filtered.filter(activity => activity.entity_type === type);
    }

    // Filter by time period
    if (period !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (period) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(activity => 
        new Date(activity.created_at) >= cutoffDate
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'type':
        filtered.sort((a, b) => a.entity_type.localeCompare(b.entity_type));
        break;
      case 'action':
        filtered.sort((a, b) => a.action_type.localeCompare(b.action_type));
        break;
    }

    setFilteredActivities(filtered);
  };

  // Re-apply filters when sort changes
  useEffect(() => {
    applyFilters(searchQuery, filterType, filterPeriod);
  }, [sortBy, filterAction]);

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = ['Date', 'Time', 'Action', 'Entity Type', 'Entity Name', 'Description'];
      const rows = filteredActivities.map(activity => [
        format(new Date(activity.created_at), 'yyyy-MM-dd'),
        format(new Date(activity.created_at), 'HH:mm:ss'),
        activity.action_type,
        activity.entity_type,
        activity.entity_name || '',
        activity.description
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateLabel: string;
    if (date.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      dateLabel = 'This Week';
    } else {
      dateLabel = format(date, 'MMM dd, yyyy');
    }
    
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(activity);
    return groups;
  }, {} as Record<string, ActivityLog[]>);

  // Count actions by type
  const actionCounts = {
    create: activities.filter(a => a.action_type === 'create').length,
    edit: activities.filter(a => a.action_type === 'update' || a.action_type === 'edit').length,
    delete: activities.filter(a => a.action_type === 'delete').length,
  };

  const getActionIcon = (actionType: string, entityType: string) => {
    switch (actionType) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'update':
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'view':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'customer':
        return <Users className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      case 'inventory':
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 fade-in">
        <h1 className="mobile-heading font-bold">Activity Tracker</h1>
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
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="mobile-heading font-bold text-primary flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            Activity Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor all actions happening in your locksmith business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="gap-2 touch-target"
            disabled={filteredActivities.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={loadActivities}
            variant="outline"
            size="sm"
            className="gap-2 responsive-btn touch-target"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <Card className="hover-lift glass-card">
          <CardHeader className="responsive-card pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-card pt-0">
            <div className="text-2xl font-bold">{stats.totalActivities}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="hover-lift glass-card">
          <CardHeader className="responsive-card pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Today's Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-card pt-0">
            <div className="text-2xl font-bold text-blue-600">{stats.todayActivities}</div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>

        <Card className="hover-lift glass-card">
          <CardHeader className="responsive-card pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Customers Added
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-card pt-0">
            <div className="text-2xl font-bold text-green-600">{stats.customersAdded}</div>
            <p className="text-xs text-muted-foreground">Total new customers</p>
          </CardContent>
        </Card>

        <Card className="hover-lift glass-card">
          <CardHeader className="responsive-card pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              Jobs Created
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-card pt-0">
            <div className="text-2xl font-bold text-purple-600">{stats.jobsCreated}</div>
            <p className="text-xs text-muted-foreground">Total jobs</p>
          </CardContent>
        </Card>

        <Card className="hover-lift glass-card">
          <CardHeader className="responsive-card pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              Inventory Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-card pt-0">
            <div className="text-2xl font-bold text-orange-600">{stats.inventoryUpdates}</div>
            <p className="text-xs text-muted-foreground">Stock changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filterAction === 'all' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/90 transition-colors px-3 py-1.5 touch-target"
          onClick={() => setFilterAction('all')}
        >
          All Actions
        </Badge>
        <Badge
          variant={filterAction === 'create' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-green-500 hover:text-white transition-colors px-3 py-1.5 border-green-500 text-green-600 touch-target"
          onClick={() => setFilterAction('create')}
        >
          ➕ Create ({actionCounts.create})
        </Badge>
        <Badge
          variant={filterAction === 'update' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-blue-500 hover:text-white transition-colors px-3 py-1.5 border-blue-500 text-blue-600 touch-target"
          onClick={() => setFilterAction('update')}
        >
          ✏️ Edit ({actionCounts.edit})
        </Badge>
        <Badge
          variant={filterAction === 'delete' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-red-500 hover:text-white transition-colors px-3 py-1.5 border-red-500 text-red-600 touch-target"
          onClick={() => setFilterAction('delete')}
        >
          🗑️ Delete ({actionCounts.delete})
        </Badge>
        {filterAction !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterAction('all')}
            className="h-7 px-2 touch-target"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2">
        <div className="flex-1 min-w-[180px]">
          <SearchBar
            placeholder="Search activities..."
            onSearch={handleSearch}
            onClear={() => handleSearch('')}
          />
        </div>
        <div className="flex space-x-2 flex-wrap sm:flex-nowrap">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] sm:w-[160px] h-9">
              <ArrowUpDown className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="type">By Entity</SelectItem>
              <SelectItem value="action">By Action</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={handleFilterType}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={handleFilterPeriod}>
            <SelectTrigger className="w-[110px] sm:w-[130px] h-9">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activities List */}
      <Card className="hover-lift">
        <CardHeader className="responsive-card">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activities
            <Badge variant="secondary" className="ml-auto">
              {filteredActivities.length} activities
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="responsive-card">
          <div className="space-y-6 max-h-[600px] overflow-y-auto mobile-overflow">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'all' || filterPeriod !== 'all'
                    ? 'No activities found matching your filters.'
                    : 'No activities recorded yet.'}
                </p>
              </div>
            ) : (
              Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 px-1 -mx-1 z-10">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {dateLabel}
                    </h3>
                  </div>
                  {dateActivities.map((activity, index) => (
                <div
                    key={activity.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors touch-manipulation`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-2 rounded-full bg-muted/30">
                      {getActionIcon(activity.action_type, activity.entity_type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1">
                            {getEntityIcon(activity.entity_type)}
                            <span className="text-xs text-muted-foreground capitalize">
                              {activity.entity_type}
                            </span>
                          </div>
                          {activity.entity_name && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {activity.entity_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1 ml-2">
                        <Badge className={getActionBadgeColor(activity.action_type)}>
                          {activity.action_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}