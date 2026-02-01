import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  IndianRupee,
  Calendar,
  Stethoscope,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DoctorSettlement {
  doctor_id: string;
  doctor_name: string;
  specialty: string | null;
  total_referrals: number;
  total_amount: number;
  total_commission: number;
}

interface MonthlySummary {
  totalRevenue: number;
  totalCommissions: number;
  netRevenue: number;
  totalVisits: number;
}

export default function Reports() {
  const [settlements, setSettlements] = useState<DoctorSettlement[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    totalRevenue: 0,
    totalCommissions: 0,
    netRevenue: 0,
    totalVisits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  useEffect(() => {
    fetchSettlementData();
  }, [selectedMonth]);

  const fetchSettlementData = async () => {
    setIsLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(monthStart);

      // Fetch visits with doctor info for the selected month
      const { data: visits, error } = await supabase
        .from('visits')
        .select(`
          id,
          amount,
          doctor_commission,
          doctor_id,
          doctors (
            id,
            name,
            specialty
          )
        `)
        .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('visit_date', format(monthEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      // Calculate summary
      const totalRevenue = visits?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
      const totalCommissions = visits?.reduce((sum, v) => sum + Number(v.doctor_commission || 0), 0) || 0;

      setSummary({
        totalRevenue,
        totalCommissions,
        netRevenue: totalRevenue - totalCommissions,
        totalVisits: visits?.length || 0,
      });

      // Group by doctor
      const doctorMap = new Map<string, DoctorSettlement>();

      visits?.forEach((visit) => {
        if (!visit.doctor_id || !visit.doctors) return;

        const existing = doctorMap.get(visit.doctor_id);
        if (existing) {
          existing.total_referrals += 1;
          existing.total_amount += Number(visit.amount);
          existing.total_commission += Number(visit.doctor_commission || 0);
        } else {
          doctorMap.set(visit.doctor_id, {
            doctor_id: visit.doctor_id,
            doctor_name: visit.doctors.name,
            specialty: visit.doctors.specialty,
            total_referrals: 1,
            total_amount: Number(visit.amount),
            total_commission: Number(visit.doctor_commission || 0),
          });
        }
      });

      setSettlements(Array.from(doctorMap.values()).sort((a, b) => 
        b.total_commission - a.total_commission
      ));
    } catch (error) {
      console.error('Error fetching settlement data:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Settlements</h1>
          <p className="text-muted-foreground">
            Monthly revenue and doctor commission summaries
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="rounded-lg bg-success/10 p-2">
              <IndianRupee className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{summary.totalVisits} visits</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Doctor Commissions
            </CardTitle>
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Stethoscope className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCommissions)}</div>
            <p className="text-xs text-muted-foreground">{settlements.length} doctors</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Revenue
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.netRevenue)}</div>
            <p className="text-xs text-muted-foreground">After commissions</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. per Visit
            </CardTitle>
            <div className="rounded-lg bg-chart-3/10 p-2">
              <FileText className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalVisits > 0
                ? formatCurrency(summary.totalRevenue / summary.totalVisits)
                : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">Per X-ray</p>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Settlements */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctor Settlement Summary
            <Badge variant="secondary" className="ml-auto">
              {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No doctor referrals for this month
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Referrals</TableHead>
                    <TableHead className="text-right">Total Billing</TableHead>
                    <TableHead className="text-right">Commission Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.doctor_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{settlement.doctor_name}</p>
                          {settlement.specialty && (
                            <p className="text-sm text-muted-foreground">
                              {settlement.specialty}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {settlement.total_referrals}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(settlement.total_amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(settlement.total_commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {settlements.reduce((sum, s) => sum + s.total_referrals, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(settlements.reduce((sum, s) => sum + s.total_amount, 0))}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(summary.totalCommissions)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
