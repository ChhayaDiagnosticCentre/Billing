import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Stethoscope,
  MapPin,
  Percent,
  Loader2,
  Edit,
  Building2,
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  clinic_name: string | null;
  address: string | null;
  percentage_share: number;
  is_active: boolean;
  created_at: string;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    clinic_name: '',
    address: '',
    percentage_share: '30',
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await (supabase
        .from('doctors' as any)
        .select('*')
        .order('name') as any);

      if (error) throw error;
      setDoctors((data as Doctor[]) || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const doctorData = {
        name: formData.name,
        clinic_name: formData.clinic_name || null,
        address: formData.address || null,
        percentage_share: parseFloat(formData.percentage_share),
      };

      if (editingDoctor) {
        const { error } = await (supabase
          .from('doctors' as any)
          .update(doctorData)
          .eq('id', editingDoctor.id) as any);

        if (error) throw error;
        toast({ title: 'Success', description: 'Doctor updated successfully' });
      } else {
        const { error } = await (supabase.from('doctors' as any).insert(doctorData) as any);
        if (error) throw error;
        toast({ title: 'Success', description: 'Doctor added successfully' });
      }

      resetForm();
      fetchDoctors();
    } catch (error) {
      console.error('Error saving doctor:', error);
      toast({
        title: 'Error',
        description: 'Failed to save doctor',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDoctorStatus = async (doctor: Doctor) => {
    try {
      const { error } = await (supabase
        .from('doctors' as any)
        .update({ is_active: !doctor.is_active })
        .eq('id', doctor.id) as any);

      if (error) throw error;
      fetchDoctors();
    } catch (error) {
      console.error('Error updating doctor status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update doctor status',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      clinic_name: '',
      address: '',
      percentage_share: '30',
    });
    setEditingDoctor(null);
    setIsAddOpen(false);
  };

  const startEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      clinic_name: doctor.clinic_name || '',
      address: doctor.address || '',
      percentage_share: doctor.percentage_share.toString(),
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="text-muted-foreground">
            Manage referring doctors and commission rates
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          else setIsAddOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Dr. John Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_name">Clinic Name</Label>
                <Input
                  id="clinic_name"
                  value={formData.clinic_name}
                  onChange={(e) =>
                    setFormData({ ...formData, clinic_name: e.target.value })
                  }
                  placeholder="City Health Clinic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Main Street, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage_share">Percentage Share (%)</Label>
                <Input
                  id="percentage_share"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.percentage_share}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      percentage_share: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingDoctor ? 'Update' : 'Add'} Doctor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Doctors Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-primary" />
            Referring Doctors
            <Badge variant="secondary" className="ml-auto">
              {doctors.filter((d) => d.is_active).length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No doctors added yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Clinic / Address</TableHead>
                    <TableHead>Share %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => (
                    <TableRow
                      key={doctor.id}
                      className={!doctor.is_active ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <p className="font-medium">{doctor.name}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          {doctor.clinic_name && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              {doctor.clinic_name}
                            </div>
                          )}
                          {doctor.address && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {doctor.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {doctor.percentage_share}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={doctor.is_active}
                          onCheckedChange={() => toggleDoctorStatus(doctor)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(doctor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
