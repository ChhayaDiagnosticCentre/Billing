import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronsUpDown, UserPlus, ScanLine, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Patient {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  clinic_name: string | null;
  percentage_share: number;
}

type PaymentReceiver = 'CENTER' | 'DOCTOR';

export default function NewVisit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patientOpen, setPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [visitDate, setVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [xrayViews, setXrayViews] = useState('1');
  const [totalAmount, setTotalAmount] = useState('');
  const [feesReceivedBy, setFeesReceivedBy] = useState<PaymentReceiver>('CENTER');

  // Get selected doctor for share display
  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);
  const doctorPercentage = selectedDoctorData?.percentage_share || 0;
  const doctorShare = totalAmount ? (parseFloat(totalAmount) * doctorPercentage / 100) : 0;
  const centerShare = totalAmount ? parseFloat(totalAmount) - doctorShare : 0;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        (supabase.from('patients' as any).select('id, name').order('name') as any),
        (supabase.from('doctors' as any).select('id, name, clinic_name, percentage_share').eq('is_active', true).order('name') as any),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;

      setPatients((patientsRes.data as Patient[]) || []);
      setDoctors((doctorsRes.data as Doctor[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast({
        title: 'Error',
        description: 'Please select a patient',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const visitData = {
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor || null,
        visit_date: visitDate,
        xray_views: parseInt(xrayViews),
        total_amount: parseFloat(totalAmount),
        doctor_percentage: selectedDoctor ? doctorPercentage : null,
        doctor_share: selectedDoctor ? doctorShare : 0,
        center_share: centerShare,
        fees_received_by: feesReceivedBy,
        created_by: user?.id || null,
      };

      const { error } = await (supabase.from('patient_visits' as any).insert(visitData) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Visit recorded successfully',
      });

      navigate('/patients');
    } catch (error) {
      console.error('Error creating visit:', error);
      toast({
        title: 'Error',
        description: 'Failed to record visit',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">New Visit</h1>
        <p className="text-muted-foreground">Record a new X-ray visit and billing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              Patient Information
            </CardTitle>
            <CardDescription>Select an existing patient or add a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatient ? selectedPatient.name : 'Select patient...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search patient..." />
                    <CommandList>
                      <CommandEmpty>
                        No patient found.
                        <Button
                          variant="link"
                          className="mt-2 w-full"
                          onClick={() => navigate('/patients')}
                        >
                          Add new patient
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={patient.name}
                            onSelect={() => {
                              setSelectedPatient(patient);
                              setPatientOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedPatient?.id === patient.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <span className="font-medium">{patient.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Visit Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScanLine className="h-5 w-5 text-primary" />
              X-Ray Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visit-date">Visit Date *</Label>
                <Input
                  id="visit-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xray-views">X-Ray Views *</Label>
                <Input
                  id="xray-views"
                  type="number"
                  min="1"
                  value={xrayViews}
                  onChange={(e) => setXrayViews(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">Referring Doctor (Optional)</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor (walk-in if none)" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.clinic_name && (
                        <span className="text-muted-foreground">
                          {' '}
                          - {doctor.clinic_name}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5 text-success" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="received-by">Fees Received By *</Label>
                <Select value={feesReceivedBy} onValueChange={(v) => setFeesReceivedBy(v as PaymentReceiver)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTER">Center</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedDoctorData && totalAmount && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Doctor Share ({doctorPercentage}%)
                  </span>
                  <span className="font-semibold text-primary">
                    ₹{doctorShare.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Center Share</span>
                  <span className="font-semibold text-success">
                    ₹{centerShare.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Visit
          </Button>
        </div>
      </form>
    </div>
  );
}
