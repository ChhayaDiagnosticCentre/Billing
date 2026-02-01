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
  Phone,
  Mail,
  Percent,
  Loader2,
  Edit,
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  commission_percentage: number;
  is_active: boolean;
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
    specialty: '',
    phone: '',
    email: '',
    commission_percentage: '30',
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
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
        specialty: formData.specialty || null,
        phone: formData.phone || null,
        email: formData.email || null,
        commission_percentage: parseFloat(formData.commission_percentage),
      };

      if (editingDoctor) {
        const { error } = await supabase
          .from('doctors')
          .update(doctorData)
          .eq('id', editingDoctor.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Doctor updated successfully' });
      } else {
        const { error } = await supabase.from('doctors').insert(doctorData);
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
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: !doctor.is_active })
        .eq('id', doctor.id);

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
      specialty: '',
      phone: '',
      email: '',
      commission_percentage: '30',
    });
    setEditingDoctor(null);
    setIsAddOpen(false);
  };

  const startEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      commission_percentage: doctor.commission_percentage.toString(),
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
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  placeholder="Orthopedics, General Medicine, etc."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="doctor@clinic.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission">Commission Percentage (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commission_percentage: e.target.value,
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
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead>Commission</TableHead>
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
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          {doctor.specialty && (
                            <p className="text-sm text-muted-foreground">
                              {doctor.specialty}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          {doctor.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {doctor.phone}
                            </div>
                          )}
                          {doctor.email && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {doctor.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {doctor.commission_percentage}%
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
