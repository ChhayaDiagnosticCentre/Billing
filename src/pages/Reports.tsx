import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  ArrowUpRight,
  ArrowDownLeft,
  Users,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DoctorSettlement {
  doctor_id: string;
  doctor_name: string;
  clinic_name: string | null;
  total_referrals: number;
  total_amount: number;
  total_doctor_share: number;
}

interface MonthlySummary {
  moneyToGiveToDoctor: number;
  moneyToReceiveFromDoctor: number;
  totalVisits: number;
}

export default function Reports() {
  const { isAdmin, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role && !isAdmin) {
      navigate('/');
    }
  }, [role, isAdmin, navigate]);

  const [settlements, setSettlements] = useState<DoctorSettlement[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    moneyToGiveToDoctor: 0,
    moneyToReceiveFromDoctor: 0,
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
      const { data: visits, error } = await (supabase
        .from('patient_visits' as any)
        .select(`
          id,
          total_amount,
          doctor_share,
          center_share,
          fees_received_by,
          doctor_id,
          doctors (
            id,
            name,
            clinic_name
          )
        `)
        .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('visit_date', format(monthEnd, 'yyyy-MM-dd')) as any);

      if (error) throw error;

      // Calculate summary
      const moneyToGiveToDoctor = (visits as any[])?.reduce((sum, v) => {
        return (v.fees_received_by || '').toUpperCase() === 'CENTER'
          ? sum + Number(v.doctor_share || 0)
          : sum;
      }, 0) || 0;

      const moneyToReceiveFromDoctor = (visits as any[])?.reduce((sum, v) => {
        return (v.fees_received_by || '').toUpperCase() === 'DOCTOR'
          ? sum + Number(v.center_share || 0)
          : sum;
      }, 0) || 0;

      setSummary({
        moneyToGiveToDoctor,
        moneyToReceiveFromDoctor,
        totalVisits: visits?.length || 0,
      });

      // Group by doctor
      const doctorMap = new Map<string, DoctorSettlement>();

      (visits as any[])?.forEach((visit) => {
        if (!visit.doctor_id || !visit.doctors) return;

        const existing = doctorMap.get(visit.doctor_id);
        if (existing) {
          existing.total_referrals += 1;
          existing.total_amount += Number(visit.total_amount);
          existing.total_doctor_share += Number(visit.doctor_share || 0);
        } else {
          doctorMap.set(visit.doctor_id, {
            doctor_id: visit.doctor_id,
            doctor_name: visit.doctors.name,
            clinic_name: visit.doctors.clinic_name,
            total_referrals: 1,
            total_amount: Number(visit.total_amount),
            total_doctor_share: Number(visit.doctor_share || 0),
          });
        }
      });

      setSettlements(Array.from(doctorMap.values()).sort((a, b) =>
        b.total_doctor_share - a.total_doctor_share
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
            Monthly revenue and doctor share summaries
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="stat-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Net: Give to Doctor
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(Math.max(0, summary.moneyToGiveToDoctor - summary.moneyToReceiveFromDoctor))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Final amount to pay</p>
          </CardContent>
        </Card>

        <Card className="stat-card border-success/20 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Net: Receive from Doctor
              <ArrowDownLeft className="h-4 w-4 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(Math.max(0, summary.moneyToReceiveFromDoctor - summary.moneyToGiveToDoctor))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Final amount to collect</p>
          </CardContent>
        </Card>

        <Card className="stat-card bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Referrals
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                    <TableHead className="text-right">Share Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.doctor_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{settlement.doctor_name}</p>
                          {settlement.clinic_name && (
                            <p className="text-sm text-muted-foreground">
                              {settlement.clinic_name}
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
                        {formatCurrency(settlement.total_doctor_share)}
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
                      {formatCurrency(settlements.reduce((sum, s) => sum + s.total_doctor_share, 0))}
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
