import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  FileText,
  IndianRupee,
  Calendar as CalendarIcon,
  Stethoscope,
  Download,
  Filter,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  name: string;
  clinic_name: string | null;
}

interface VisitRecord {
  id: string;
  visit_date: string;
  xray_type: string;
  total_amount: number;
  doctor_share: number;
  center_share: number;
  fees_received_by: string;
  patient: {
    id: string;
    name: string;
  };
  doctor: {
    id: string;
    name: string;
    clinic_name: string | null;
  } | null;
}

interface SettlementSummary {
  totalAmount: number;
  totalDoctorShare: number;
  ownerReceivedTotal: number;
  doctorReceivedTotal: number;
  ownerOwesToDoctor: number;
  doctorOwesToOwner: number;
  netSettlement: number;
  settlementDirection: 'pay_doctor' | 'receive_from_doctor' | 'settled';
}

export default function Billing() {
  const { role, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role && !isAdmin) {
      navigate('/');
    }
  }, [role, isAdmin, navigate]);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [hideTitle, setHideTitle] = useState(false);

  // Date filters
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [filterMode, setFilterMode] = useState<'range' | 'month'>('month');

  // Month options for dropdown (past 12 months, in chronological order)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    // Start from 11 months ago and move to current month
    const date = subMonths(new Date(), 11 - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Fetch visits when filters change
  useEffect(() => {
    if (selectedDoctor) {
      fetchVisits();
    } else {
      setVisits([]);
    }
  }, [selectedDoctor, fromDate, toDate, selectedMonth, filterMode]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await (supabase.from('doctors' as any).select('id, name, clinic_name, percentage_share').eq('is_active', true).order('name') as any)

      if (error) throw error;
      setDoctors((data || []).map(d => ({ ...d, clinic_name: d.specialty })));
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const fetchVisits = async () => {
    if (!selectedDoctor) return;

    setIsLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (filterMode === 'month') {
        const [year, month] = selectedMonth.split('-');
        const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const monthEnd = endOfMonth(monthStart);
        startDate = format(monthStart, 'yyyy-MM-dd');
        endDate = format(monthEnd, 'yyyy-MM-dd');
      } else {
        startDate = fromDate ? format(fromDate, 'yyyy-MM-dd') : '';
        endDate = toDate ? format(toDate, 'yyyy-MM-dd') : '';
      }

      const { data, error } = await (supabase
        .from('patient_visits' as any)
        .select(`
          id,
          visit_date,
          xray_views,
          total_amount,
          doctor_share,
          center_share,
          fees_received_by,
          patient:patients!patient_id(id, name),
          doctor:doctors!doctor_id(id, name, clinic_name)
        `)
        .eq('doctor_id', selectedDoctor)
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date', { ascending: true }) as any);

      if (error) throw error;

      const formattedVisits = (data || []).map((visit: any) => ({
        id: visit.id,
        visit_date: visit.visit_date,
        xray_type: visit.xray_views || 'N/A',
        total_amount: Number(visit.total_amount) || 0,
        doctor_share: Number(visit.doctor_share) || 0,
        center_share: Number(visit.center_share) || 0,
        fees_received_by: (visit.fees_received_by || 'CENTER').toUpperCase(),
        patient: visit.patient,
        doctor: visit.doctor,
      }));

      setVisits(formattedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate settlement summary
  const settlement = useMemo<SettlementSummary>(() => {
    const totalAmount = visits.reduce((sum, v) => sum + v.total_amount, 0);
    const totalDoctorShare = visits.reduce((sum, v) => sum + v.doctor_share, 0);

    // When center receives payment, they owe doctor's share to doctor
    const ownerReceivedVisits = visits.filter(v => v.fees_received_by === 'CENTER');
    const ownerOwesToDoctor = ownerReceivedVisits.reduce((sum, v) => sum + v.doctor_share, 0);
    const ownerReceivedTotal = ownerReceivedVisits.reduce((sum, v) => sum + v.total_amount, 0);

    // When doctor receives payment, they owe center's share to center
    const doctorReceivedVisits = visits.filter(v => v.fees_received_by === 'DOCTOR');
    const doctorOwesToOwner = doctorReceivedVisits.reduce((sum, v) => sum + v.center_share, 0);
    const doctorReceivedTotal = doctorReceivedVisits.reduce((sum, v) => sum + v.total_amount, 0);

    const netSettlement = ownerOwesToDoctor - doctorOwesToOwner;

    let settlementDirection: 'pay_doctor' | 'receive_from_doctor' | 'settled' = 'settled';
    if (netSettlement > 0) {
      settlementDirection = 'pay_doctor';
    } else if (netSettlement < 0) {
      settlementDirection = 'receive_from_doctor';
    }

    return {
      totalAmount,
      totalDoctorShare,
      ownerReceivedTotal,
      doctorReceivedTotal,
      ownerOwesToDoctor,
      doctorOwesToOwner,
      netSettlement: Math.abs(netSettlement),
      settlementDirection,
    };
  }, [visits]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyPDF = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d.id === selectedDoctor);
    return doctor?.name || 'Unknown';
  };

  const getFilterPeriodText = () => {
    if (filterMode === 'month') {
      const option = monthOptions.find(m => m.value === selectedMonth);
      return option?.label || selectedMonth;
    }
    if (fromDate && toDate) {
      return `${format(fromDate, 'dd MMM yyyy')} - ${format(toDate, 'dd MMM yyyy')}`;
    }
    return 'Custom Range';
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title and Subtitle
    if (!hideTitle) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Billing & Settlement Report', pageWidth / 2, 20, { align: 'center' });

      // Subtitle with timestamp
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, 32, { align: 'center' });
    }

    // Filters
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Doctor: ${getSelectedDoctorName()}`, 14, 48);
    doc.text(`Period: ${getFilterPeriodText()}`, 14, 54);

    // Table
    const tableData = visits.map((visit, index) => [
      index + 1,
      format(parseISO(visit.visit_date), 'dd/MM/yyyy'),
      visit.patient?.name || 'Unknown',
      visit.xray_type,
      formatCurrencyPDF(visit.total_amount),
      formatCurrencyPDF(visit.doctor_share),
      visit.fees_received_by === 'CENTER' || visit.fees_received_by === 'center' ? 'Center' : 'Doctor',
    ]);

    autoTable(doc, {
      startY: 62,
      head: [['Sr.', 'Date', 'Patient Name', 'View', 'Total', "Doctor's Share", 'Received By']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [234, 88, 12] }, // Professional Orange (Tailwind orange-600)
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.section === 'head' && (data.column.index === 4 || data.column.index === 5)) {
          data.cell.styles.halign = 'right';
        }
      },
    });

    // Settlement Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Settlement Summary', 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const summaryStartY = finalY + 8;
    doc.text(`Doctor's Share (Collected by Center): ${formatCurrencyPDF(settlement.ownerOwesToDoctor)}`, 14, summaryStartY);
    doc.text(`Center's Share (Collected by Doctor): ${formatCurrencyPDF(settlement.doctorOwesToOwner)}`, 14, summaryStartY + 8);

    // Net
    doc.setFont('helvetica', 'bold');
    if (settlement.ownerOwesToDoctor >= settlement.doctorOwesToOwner) {
      doc.text(`Final Net Settlement: Give ${formatCurrencyPDF(settlement.ownerOwesToDoctor - settlement.doctorOwesToOwner)} to Doctor`, 14, summaryStartY + 18);
    } else {
      doc.text(`Final Net Settlement: Receive ${formatCurrencyPDF(settlement.doctorOwesToOwner - settlement.ownerOwesToDoctor)} from Doctor`, 14, summaryStartY + 18);
    }

    // Final Thank You
    doc.setFontSize(14);
    doc.setFont('helvetica');
    doc.text('Thank You!', pageWidth / 2, summaryStartY + 30, { align: 'center' });

    // Save PDF
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = `billing-${getSelectedDoctorName().replace(/\s+/g, '-')}-${timestamp}.pdf`;
    doc.save(filename);
    toast.success('PDF downloaded successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Settlements</h1>
          <p className="text-muted-foreground">
            View and manage doctor billing settlements
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Doctor Selection */}
            <div className="space-y-2">
              <Label>Select Doctor</Label>
              <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={doctorOpen}
                    className="w-full justify-between font-normal"
                  >
                    <div className="flex items-center overflow-hidden">
                      <Stethoscope className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {selectedDoctor
                          ? doctors.find((d) => d.id === selectedDoctor)?.name
                          : 'Choose a doctor'}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search doctor..." />
                    <CommandList>
                      <CommandEmpty>No doctor found.</CommandEmpty>
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor.id}
                            value={doctor.name}
                            onSelect={() => {
                              setSelectedDoctor(doctor.id);
                              setDoctorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedDoctor === doctor.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{doctor.name}</span>
                              {doctor.clinic_name && (
                                <span className="text-xs text-muted-foreground">
                                  {doctor.clinic_name}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Filter Mode Toggle */}
            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterMode} onValueChange={(v: 'range' | 'month') => setFilterMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector or Date Range */}
            {filterMode === 'month' ? (
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label>Select Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
            ) : (
              <>
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !fromDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !toDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {selectedDoctor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Billing Records
              <Badge variant="secondary" className="ml-2">
                {visits.length} records
              </Badge>
            </CardTitle>
            {visits.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hideTitle"
                    checked={hideTitle}
                    onCheckedChange={(checked) => setHideTitle(!!checked)}
                  />
                  <Label
                    htmlFor="hideTitle"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    hide title on pdf report
                  </Label>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="gap-2">
                      <Download className="h-4 w-4" />
                      Generate PDF
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generate PDF Report</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will generate a PDF report with the current billing data for{' '}
                        <strong>{getSelectedDoctorName()}</strong> for the period{' '}
                        <strong>{getFilterPeriodText()}</strong>.
                        {hideTitle && (
                          <span className="block mt-2 text-primary font-medium">
                            Note: Title will be hidden on the report.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={generatePDF}>
                        Download PDF
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : visits.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No billing records found for the selected filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sr. No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>View</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Doctor's Share</TableHead>
                      <TableHead>Received By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((visit, index) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          {format(parseISO(visit.visit_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{visit.patient?.name || 'Unknown'}</TableCell>
                        <TableCell>{visit.xray_type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(visit.total_amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(visit.doctor_share)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={visit.fees_received_by === 'CENTER' ? 'default' : 'secondary'}>
                            {visit.fees_received_by === 'CENTER' ? 'Center' : 'Doctor'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settlement Summary */}
      {selectedDoctor && visits.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5 text-primary" />
              Settlement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Total Billing</p>
                <p className="text-2xl font-bold">{formatCurrency(settlement.totalAmount)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Total Doctor's Share</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(settlement.totalDoctorShare)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Center Received</p>
                <p className="text-xl font-semibold">{formatCurrency(settlement.ownerReceivedTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  Owes {formatCurrency(settlement.ownerOwesToDoctor)} to Doctor
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Doctor Received</p>
                <p className="text-xl font-semibold">{formatCurrency(settlement.doctorReceivedTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  Owes {formatCurrency(settlement.doctorOwesToOwner)} to Center
                </p>
              </div>
            </div>

            {/* Net Settlement */}
            <div className="mt-6">
              <div
                className={cn(
                  'rounded-lg p-4 flex items-center gap-4',
                  settlement.settlementDirection === 'pay_doctor' && 'bg-destructive/10 border border-destructive/20',
                  settlement.settlementDirection === 'receive_from_doctor' && 'bg-success/10 border border-success/20',
                  settlement.settlementDirection === 'settled' && 'bg-muted border border-muted-foreground/20'
                )}
              >
                {settlement.settlementDirection === 'pay_doctor' && (
                  <ArrowUpRight className="h-8 w-8 text-destructive" />
                )}
                {settlement.settlementDirection === 'receive_from_doctor' && (
                  <ArrowDownLeft className="h-8 w-8 text-success" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Net Settlement</p>
                  {settlement.settlementDirection === 'pay_doctor' && (
                    <p className="text-xl font-bold text-destructive">
                      Center needs to pay {formatCurrency(settlement.netSettlement)} to {getSelectedDoctorName()}
                    </p>
                  )}
                  {settlement.settlementDirection === 'receive_from_doctor' && (
                    <p className="text-xl font-bold text-success">
                      {getSelectedDoctorName()} needs to pay {formatCurrency(settlement.netSettlement)} to Center
                    </p>
                  )}
                  {settlement.settlementDirection === 'settled' && (
                    <p className="text-xl font-bold">All Settled - No amount due</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedDoctor && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stethoscope className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>Please select a doctor to view billing records</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
