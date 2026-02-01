import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Stethoscope,
  IndianRupee,
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardStats {
  todayVisits: number;
  todayRevenue: number;
  totalDoctors: number;
  monthlyRevenue: number;
  pendingCommission: number;
}

interface ChartData {
  date: string;
  revenue: number;
  visits: number;
}

export default function Dashboard() {
  const { isAdmin, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    todayRevenue: 0,
    totalDoctors: 0,
    monthlyRevenue: 0,
    pendingCommission: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch today's visits
      const { data: todayVisits, error: todayError } = await supabase
        .from('visits')
        .select('amount, doctor_commission')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Fetch monthly visits
      const { data: monthlyVisits, error: monthlyError } = await supabase
        .from('visits')
        .select('amount, doctor_commission')
        .gte('created_at', monthStart);

      // Fetch doctors count
      const { count: doctorsCount } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Calculate stats
      const todayRevenue = todayVisits?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
      const monthlyRevenue = monthlyVisits?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
      const pendingCommission = monthlyVisits?.reduce((sum, v) => sum + Number(v.doctor_commission || 0), 0) || 0;

      setStats({
        todayVisits: todayVisits?.length || 0,
        todayRevenue,
        totalDoctors: doctorsCount || 0,
        monthlyRevenue,
        pendingCommission,
      });

      // Fetch last 7 days for chart
      const chartDataPromises = Array.from({ length: 7 }, async (_, i) => {
        const date = subDays(today, 6 - i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();

        const { data } = await supabase
          .from('visits')
          .select('amount')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);

        return {
          date: format(date, 'MMM dd'),
          revenue: data?.reduce((sum, v) => sum + Number(v.amount), 0) || 0,
          visits: data?.length || 0,
        };
      });

      const chartResults = await Promise.all(chartDataPromises);
      setChartData(chartResults);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Today's Visits",
      value: stats.todayVisits,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: IndianRupee,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Active Doctors',
      value: stats.totalDoctors,
      icon: Stethoscope,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      adminOnly: true,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      icon: TrendingUp,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(), 'EEEE, MMM d')}
          </Badge>
          <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
            {role}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards
          .filter((card) => !card.adminOnly || isAdmin)
          .map((card) => (
            <Card key={card.title} className="stat-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts - Admin Only */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Revenue Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-success" />
                Daily Visits (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Visits']}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorVisits)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Commission Alert - Admin Only */}
      {isAdmin && stats.pendingCommission > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-warning/20 p-3">
              <IndianRupee className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">Pending Doctor Commissions</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stats.pendingCommission)} to be settled this month
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
