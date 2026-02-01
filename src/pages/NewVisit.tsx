import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface Patient {
  id: string;
  name: string;
  phone: string | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  commission_percentage: number;
}

const XRAY_TYPES = [
  'Chest X-Ray',
  'Abdominal X-Ray',
  'Spine X-Ray',
  'Extremity X-Ray',
  'Skull X-Ray',
  'Dental X-Ray',
  'Mammography',
  'Fluoroscopy',
  'Other',
];

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
  const [xrayType, setXrayType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Get selected doctor for commission display
  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);
  const estimatedCommission = selectedDoctorData && amount
    ? (parseFloat(amount) * selectedDoctorData.commission_percentage / 100).toFixed(2)
    : null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, name, phone').order('name'),
        supabase.from('doctors').select('id, name, specialty, commission_percentage').eq('is_active', true).order('name'),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;

      setPatients(patientsRes.data || []);
      setDoctors(doctorsRes.data || []);
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
      const { error } = await supabase.from('visits').insert({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor || null,
        xray_type: xrayType,
        amount: parseFloat(amount),
        notes: notes || null,
        created_by: user?.id,
      });

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
                    {selectedPatient
                      ? `${selectedPatient.name}${selectedPatient.phone ? ` (${selectedPatient.phone})` : ''}`
                      : 'Select patient...'}
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
                            value={`${patient.name} ${patient.phone || ''}`}
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
                            <div>
                              <span className="font-medium">{patient.name}</span>
                              {patient.phone && (
                                <span className="ml-2 text-muted-foreground">
                                  {patient.phone}
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
            <div className="space-y-2">
              <Label htmlFor="xray-type">X-Ray Type *</Label>
              <Select value={xrayType} onValueChange={setXrayType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select X-ray type" />
                </SelectTrigger>
                <SelectContent>
                  {XRAY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">Referring Doctor (Optional)</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.specialty && (
                        <span className="text-muted-foreground">
                          {' '}
                          - {doctor.specialty}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
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
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />
            </div>

            {selectedDoctorData && estimatedCommission && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Doctor Commission ({selectedDoctorData.commission_percentage}%)
                </p>
                <p className="text-lg font-semibold text-primary">
                  ₹{estimatedCommission}
                </p>
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
