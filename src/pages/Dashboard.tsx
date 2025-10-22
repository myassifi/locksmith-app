import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, DollarSign, Plus, Clock, CheckCircle, TrendingUp, Calendar, AlertCircle, RefreshCw, FileText, Users, Package, Download, AlertTriangle, Info, CheckCircle2, X, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, isThisMonth, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Job {
  id: string;
  customer_name: string;
  service_type: string;
  status: 'pending' | 'in_progress' | 'completed';
  total_amount: number;
  created_at: string;
}

interface DashboardData {
  // Income metrics
  income: {
    today: number;
    thisMonth: number;
    lastMonth: number;
    total: number;
    averageJobValue: number; // Average value per paid job
    monthlyGrowth: number; // Percentage change from last month
  };
  
  // Job metrics
  jobs: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    recent: Job[];
  };
  
  // Simple chart data
  weeklyIncome: Array<{ date: string; amount: number }>;
  jobStatus: Array<{ status: string; count: number }>;
}

type DateRange = 'today' | 'week' | 'month' | 'lastMonth' | 'all';

const getDateRangeFilter = (range: DateRange) => {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.setHours(23, 59, 59, 999)),
      };
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    case 'all':
    default:
      return null;
  }
};

const fetchDashboardData = async (dateRange: DateRange = 'all'): Promise<DashboardData> => {
    try {
      // Fetch all jobs data
      let query = supabase.from('jobs').select('*');
      
      // Apply date range filter if not 'all'
      const dateFilter = getDateRangeFilter(dateRange);
      if (dateFilter) {
        query = query
          .gte('created_at', dateFilter.start.toISOString())
          .lte('created_at', dateFilter.end.toISOString());
      }
      
      const { data: allJobs, error: jobsError } = await query.order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Calculate job metrics
      const now = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      
      const pendingJobs = allJobs?.filter(job => job.status === 'pending').length || 0;
      const inProgressJobs = allJobs?.filter(job => job.status === 'in_progress').length || 0;
      const completedJobs = allJobs?.filter(job => job.status === 'completed').length || 0;
      const totalJobs = allJobs?.length || 0;
      
      // Completion rate
      const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

      // Calculate income metrics
      // Count income from completed jobs (customer pays on completion)
      const today = allJobs
        ?.filter(job => job.status === 'completed' && isToday(new Date(job.created_at)))
        .reduce((sum, job) => {
          const amount = Number(job.total_amount) || 0;
          return sum + amount;
        }, 0) || 0;

      const thisMonthIncome = allJobs
        ?.filter(job => job.status === 'completed' && isThisMonth(new Date(job.created_at)))
        .reduce((sum, job) => {
          const amount = Number(job.total_amount) || 0;
          return sum + amount;
        }, 0) || 0;

      const lastMonthIncome = allJobs
        ?.filter(job => {
          const jobDate = new Date(job.created_at);
          return job.status === 'completed' && 
                 jobDate.getMonth() === lastMonth.getMonth() && 
                 jobDate.getFullYear() === lastMonth.getFullYear();
        })
        .reduce((sum, job) => {
          const amount = Number(job.total_amount) || 0;
          return sum + amount;
        }, 0) || 0;

      const totalIncome = allJobs
        ?.filter(job => job.status === 'completed')
        .reduce((sum, job) => {
          const amount = Number(job.total_amount) || 0;
          return sum + amount;
        }, 0) || 0;
      
      // Calculate average job value (from completed jobs)
      const averageJobValue = completedJobs > 0 ? totalIncome / completedJobs : 0;
      
      // Calculate monthly growth percentage
      const monthlyGrowth = lastMonthIncome > 0 
        ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
        : thisMonthIncome > 0 ? 100 : 0;

      // Generate weekly income data (last 7 days)
      // Weekly income from completed jobs
      const weeklyIncome = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        const dayJobs = allJobs?.filter(job => {
          const jobDate = new Date(job.created_at);
          return job.status === 'completed' && jobDate.toDateString() === date.toDateString();
        }) || [];
        
        return {
          date: format(date, 'EEE'),
          amount: dayJobs.reduce((sum, job) => {
            const amount = Number(job.total_amount) || 0;
            return sum + amount;
          }, 0)
        };
      });

      // Job status distribution - only include statuses with jobs
      const jobStatus = [
        { status: 'Completed', count: completedJobs },
        { status: 'In Progress', count: inProgressJobs },
        { status: 'Pending', count: pendingJobs },
      ].filter(item => item.count > 0);

      // Set dashboard data
      const dashboardData: DashboardData = {
        income: {
          today,
          thisMonth: thisMonthIncome,
          lastMonth: lastMonthIncome,
          total: totalIncome,
          averageJobValue,
          monthlyGrowth,
        },
        jobs: {
          total: totalJobs,
          pending: pendingJobs,
          inProgress: inProgressJobs,
          completed: completedJobs,
          completionRate,
          recent: allJobs?.slice(0, 5).map(job => ({
            id: job.id,
            customer_name: job.customer_name || 'Unknown',
            service_type: job.service_type || 'Service',
            status: job.status || 'pending',
            total_amount: job.total_amount || 0,
            created_at: job.created_at
          })) || [],
        },
        weeklyIncome,
        jobStatus,
      };

      return dashboardData;
    } catch (error) {
      console.error('Dashboard load error:', error);
      throw error;
    }
  };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Helper to navigate to Jobs with filters
  const navigateToJobs = (params: { status?: string; when?: string }) => {
    const search = new URLSearchParams({
      ...(params.status ? { status: params.status } : {}),
      ...(params.when ? { when: params.when } : {}),
    }).toString();
    navigate(`/jobs${search ? `?${search}` : ''}`);
  };
  
  // Use React Query for data fetching
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['dashboard-data', dateRange],
    queryFn: () => fetchDashboardData(dateRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    onError: (error) => {
      toast.error('Failed to load dashboard data', {
        description: 'Please try refreshing the page',
      });
    },
  });
  
  // Real-time updates for jobs table
  useRealtimeUpdates({
    table: 'jobs',
    onInsert: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('New job added', {
        description: 'Dashboard updated with latest data',
      });
    },
    onUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.info('Job updated', {
        description: 'Dashboard refreshed',
      });
    },
    onDelete: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.info('Job deleted', {
        description: 'Dashboard updated',
      });
    },
  });
  
  // Default data structure
  const defaultData: DashboardData = {
    income: { today: 0, thisMonth: 0, lastMonth: 0, total: 0, averageJobValue: 0, monthlyGrowth: 0 },
    jobs: { total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0, recent: [] },
    weeklyIncome: [],
    jobStatus: [],
  };
  
  const data = dashboardData || defaultData;
  
  // Smart Alerts Logic
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  const getSmartAlerts = () => {
    const alerts: Array<{ id: string; type: 'warning' | 'info' | 'success'; title: string; message: string; action?: () => void; actionLabel?: string }> = [];
    
    // Alert: Too many pending jobs
    if (data.jobs.pending >= 3 && !dismissedAlerts.includes('pending-jobs')) {
      alerts.push({
        id: 'pending-jobs',
        type: 'warning',
        title: 'Pending Jobs Need Attention',
        message: `You have ${data.jobs.pending} jobs waiting to start. Review and begin working on them.`,
        action: () => navigateToJobs({ status: 'pending', when: 'all' }),
        actionLabel: 'View Pending Jobs'
      });
    }
    
    // Alert: Great performance
    if (data.income.monthlyGrowth > 20 && !dismissedAlerts.includes('great-growth')) {
      alerts.push({
        id: 'great-growth',
        type: 'success',
        title: 'Excellent Growth! 🎉',
        message: `You're ${data.income.monthlyGrowth}% ahead of last month. Keep up the great work!`,
      });
    }
    
    // Alert: Behind last month
    if (data.income.monthlyGrowth < -10 && !dismissedAlerts.includes('behind-growth')) {
      alerts.push({
        id: 'behind-growth',
        type: 'warning',
        title: 'Income Below Last Month',
        message: `Revenue is ${Math.abs(data.income.monthlyGrowth)}% lower than last month. Consider following up with customers.`,
        action: () => navigateToJobs({ status: 'pending', when: 'all' }),
        actionLabel: 'Start Pending Jobs'
      });
    }
    
    // Alert: No income today (after 2pm)
    const currentHour = new Date().getHours();
    if (data.income.today === 0 && currentHour >= 14 && !dismissedAlerts.includes('no-income-today')) {
      alerts.push({
        id: 'no-income-today',
        type: 'info',
        title: 'No Completed Jobs Today',
        message: 'You haven\'t completed any paid jobs today yet. Check your in-progress jobs.',
        action: () => navigateToJobs({ status: 'in_progress', when: 'all' }),
        actionLabel: 'View Active Jobs'
      });
    }
    
    return alerts;
  };
  
  const smartAlerts = getSmartAlerts();
  
  // Export dashboard data as CSV
  const exportToCSV = () => {
    try {
      const dateRangeLabel = {
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
        lastMonth: 'Last Month',
        all: 'All Time'
      }[dateRange];
      
      // Prepare CSV content
      const csvContent = [
        ['Heat Wave Locksmith - Dashboard Report'],
        [`Date Range: ${dateRangeLabel}`],
        [`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`],
        [],
        ['INCOME SUMMARY'],
        ['Metric', 'Amount'],
        ['Today\'s Income', `$${data.income.today.toFixed(2)}`],
        ['Monthly Income', `$${data.income.thisMonth.toFixed(2)}`],
        ['Last Month Income', `$${data.income.lastMonth.toFixed(2)}`],
        ['Total Income', `$${data.income.total.toFixed(2)}`],
        [],
        ['JOB STATISTICS'],
        ['Metric', 'Count'],
        ['Total Jobs', data.jobs.total],
        ['Pending Jobs', data.jobs.pending],
        ['In Progress Jobs', data.jobs.inProgress],
        ['Completed Jobs', data.jobs.completed],
        ['Completion Rate', `${data.jobs.completionRate}%`],
        [],
        ['WEEKLY INCOME'],
        ['Day', 'Amount'],
        ...data.weeklyIncome.map(day => [day.date, `$${day.amount.toFixed(2)}`]),
        [],
        ['RECENT JOBS'],
        ['Customer', 'Service', 'Status', 'Amount', 'Date'],
        ...data.jobs.recent.map(job => [
          job.customer_name,
          job.service_type,
          job.status,
          `$${job.total_amount.toFixed(2)}`,
          format(new Date(job.created_at), 'MMM d, yyyy')
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully', {
        description: 'Your dashboard report has been downloaded',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report', {
        description: 'Please try again',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Smart Alert Banner */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.type === 'warning' ? 'destructive' : 'default'}
              className={`relative ${
                alert.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                alert.type === 'info' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
                'border-amber-500 bg-amber-50 dark:bg-amber-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertTitle className="text-sm font-semibold mb-1">{alert.title}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {alert.message}
                  </AlertDescription>
                  {alert.action && alert.actionLabel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={alert.action}
                      className="mt-2"
                    >
                      {alert.actionLabel}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={data.jobs.total === 0}
            className="gap-1 h-9"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="h-9 px-3"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/jobs/new')} className="gap-2 h-9">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New Job</span>
          </Button>
        </div>
      </div>

      {/* Job Status Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3 px-1">Job Status</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card 
            role="button" 
            onClick={() => navigateToJobs({ status: 'pending', when: dateRange })} 
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-amber-200 dark:border-amber-900"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{data.jobs.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Waiting to start
              </p>
            </CardContent>
          </Card>

          <Card 
            role="button" 
            onClick={() => navigateToJobs({ status: 'in_progress', when: dateRange })} 
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-blue-200 dark:border-blue-900"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{data.jobs.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently working on
              </p>
            </CardContent>
          </Card>

          <Card 
            role="button" 
            onClick={() => navigateToJobs({ status: 'completed', when: dateRange })} 
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-green-200 dark:border-green-900"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">{data.jobs.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Finished & paid
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Income Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3 px-1">Income Overview</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card role="button" onClick={() => navigateToJobs({ status: 'completed', when: 'today' })} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Income</CardTitle>
              <div className="flex items-center gap-1">
                {data.income.today > 0 && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.income.today)}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {data.income.today > 0 ? (
                  <>
                    <span className="text-green-600 font-medium">Active</span>
                    <span>• From completed jobs</span>
                  </>
                ) : (
                  <span className="text-amber-600">No income today yet</span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card role="button" onClick={() => navigateToJobs({ status: 'completed', when: 'month' })} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{formatCurrency(data.income.thisMonth)}</div>
                {data.income.monthlyGrowth !== 0 && (
                  <div className={`flex items-center gap-0.5 text-sm font-semibold ${
                    data.income.monthlyGrowth > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {data.income.monthlyGrowth > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(data.income.monthlyGrowth)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
            </CardContent>
          </Card>
          
          <Card role="button" onClick={() => navigateToJobs({ status: 'completed', when: 'all' })} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.income.total)}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="font-medium text-green-600">{data.jobs.completed}</span>
                <span>completed jobs</span>
              </p>
            </CardContent>
          </Card>
          
          <Card role="button" onClick={() => navigateToJobs({ status: 'completed', when: 'all' })} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
              <div className="flex items-center gap-1">
                {data.jobs.completed > 0 && (
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.income.averageJobValue)}</div>
              <p className="text-xs text-muted-foreground">
                Per job • <span className="font-medium">{data.jobs.completed}</span> completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Income</CardTitle>
            <CardDescription>Income for the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklyIncome.every(day => day.amount === 0) ? (
              <div className="h-[200px] sm:h-[250px] flex flex-col items-center justify-center text-center p-4 sm:p-6">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg mb-2">No Income Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start adding jobs to see your weekly income trends
                </p>
                <Button onClick={() => navigate('/jobs/new')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Job
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.weeklyIncome}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <p className="text-sm font-medium">{payload[0].payload.date}</p>
                          <p className="text-sm text-primary font-bold">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Job Status */}
        <Card>
          <CardHeader>
            <CardTitle>Job Status</CardTitle>
            <CardDescription>Current job distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {data.jobStatus.length === 0 ? (
              <div className="h-[200px] sm:h-[250px] flex flex-col items-center justify-center text-center p-4 sm:p-6">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg mb-2">No Jobs Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first job to start tracking your business
                </p>
                <Button onClick={() => navigate('/jobs/new')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                <Pie
                  data={data.jobStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) => {
                    if (count === 0) return null;
                    return `${status}: ${count} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  onClick={(_, index) => {
                    const item = data.jobStatus[index];
                    if (!item) return;
                    const statusMap: Record<string, string> = {
                      'Completed': 'completed',
                      'In Progress': 'in_progress',
                      'Pending': 'pending'
                    };
                    navigateToJobs({ status: statusMap[item.status] || 'completed', when: dateRange });
                  }}
                >
                  {data.jobStatus.map((entry, index) => {
                    const colors = {
                      'Completed': '#22c55e',
                      'In Progress': '#3b82f6',
                      'Pending': '#f59e0b'
                    };
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[entry.status as keyof typeof colors] || '#8884d8'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {data.status === 'Completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : data.status === 'In Progress' ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                            <p className="text-sm font-medium">{data.status}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {data.count} {data.count === 1 ? 'job' : 'jobs'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>Latest job activities</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.jobs.recent.length > 0 ? (
              data.jobs.recent.map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      job.status === 'completed' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/50' 
                        : job.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50'
                    }`}>
                      {job.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : job.status === 'in_progress' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{job.service_type}</p>
                      <p className="text-sm text-muted-foreground">{job.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(job.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(job.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Jobs Found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {dateRange === 'today' 
                    ? 'No jobs created today. Start by creating a new job.'
                    : dateRange === 'week'
                    ? 'No jobs this week. Create a job to get started.'
                    : dateRange === 'month'
                    ? 'No jobs this month. Time to create your first job!'
                    : dateRange === 'lastMonth'
                    ? 'No jobs last month. Check a different time period or create a new job.'
                    : 'Get started by creating your first job and tracking your business.'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/jobs/new')} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job
                  </Button>
                  <Button onClick={() => navigate('/customers')} variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
