import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, Loader2, IndianRupee, User, Stethoscope, Eye, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

interface Visit {
  id: string;
  visit_date: string;
  xray_views: number;
  total_amount: number;
  doctor_share: number;
  center_share: number;
  fees_received_by: 'CENTER' | 'DOCTOR';
  created_at: string;
  patient: {
    id: string;
    name: string;
  } | null;
  doctor: {
    id: string;
    name: string;
    clinic_name: string | null;
  } | null;
}

type SortOption = 'created_at_desc' | 'created_at_asc' | 'visit_date_desc' | 'visit_date_asc' | 'patient_asc' | 'patient_desc' | 'amount_desc' | 'amount_asc' | 'xray_views_desc' | 'xray_views_asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_at_desc', label: 'Entry Date (Newest)' },
  { value: 'created_at_asc', label: 'Entry Date (Oldest)' },
  { value: 'visit_date_desc', label: 'Visit Date (Newest)' },
  { value: 'visit_date_asc', label: 'Visit Date (Oldest)' },
  { value: 'patient_asc', label: 'Patient Name (A-Z)' },
  { value: 'patient_desc', label: 'Patient Name (Z-A)' },
  { value: 'amount_desc', label: 'Amount (High-Low)' },
  { value: 'amount_asc', label: 'Amount (Low-High)' },
  { value: 'xray_views_desc', label: 'X-Ray Views (High-Low)' },
  { value: 'xray_views_asc', label: 'X-Ray Views (Low-High)' },
];

export default function RecentEntries() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
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
          created_at,
          patient:patients!patient_id(id, name),
          doctor:doctors!doctor_id(id, name, clinic_name)
        `)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      setVisits((data as Visit[]) || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recent entries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVisits = useMemo(() => {
    const filtered = visits.filter((visit) =>
      visit.patient?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created_at_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'visit_date_desc':
          return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
        case 'visit_date_asc':
          return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
        case 'patient_asc':
          return (a.patient?.name || '').localeCompare(b.patient?.name || '');
        case 'patient_desc':
          return (b.patient?.name || '').localeCompare(a.patient?.name || '');
        case 'amount_desc':
          return b.total_amount - a.total_amount;
        case 'amount_asc':
          return a.total_amount - b.total_amount;
        case 'xray_views_desc':
          return b.xray_views - a.xray_views;
        case 'xray_views_asc':
          return a.xray_views - b.xray_views;
        default:
          return 0;
      }
    });
  }, [visits, searchQuery, sortBy]);

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await (supabase
        .from('patient_visits' as any)
        .delete()
        .eq('id', visitToDelete.id) as any);

      if (error) throw error;

      setVisits((prev) => prev.filter((v) => v.id !== visitToDelete.id));
      setVisitToDelete(null);

      toast({
        title: 'Success',
        description: 'Visit record deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete visit record',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recent Entries</h1>
          <p className="text-muted-foreground">
            View and search recent X-ray visits
          </p>
        </div>
        <Button onClick={() => navigate('/visits/new')} className="gap-2">
          <Calendar className="h-4 w-4" />
          New Visit
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visits Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Visit Records
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                  <SelectTrigger className="w-[200px] h-8 text-sm font-normal">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">
                {filteredVisits.length} entries
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery ? 'No visits found matching your search' : 'No visits recorded yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>X-Ray Views</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.map((visit) => (
                    <TableRow
                      key={visit.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <TableCell className="font-medium">
                        {visit.patient?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visit.xray_views} view{visit.xray_views > 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{visit.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visit.fees_received_by === 'CENTER' ? 'default' : 'secondary'}>
                          {visit.fees_received_by === 'CENTER' ? 'Center' : 'Doctor'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVisitToDelete(visit);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Details Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{selectedVisit.patient?.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">Patient</p>
                </div>
              </div>

              {/* Doctor Info */}
              {selectedVisit.doctor && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Stethoscope className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{selectedVisit.doctor.name}</p>
                    {selectedVisit.doctor.clinic_name && (
                      <p className="text-sm text-muted-foreground">{selectedVisit.doctor.clinic_name}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Visit Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Visit Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedVisit.visit_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">X-Ray Views</p>
                  <p className="font-medium">{selectedVisit.xray_views}</p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-success" />
                  <span className="font-medium">Billing</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">₹{selectedVisit.total_amount.toFixed(2)}</span>
                </div>
                {isAdmin && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Doctor Share</span>
                      <span className="font-medium text-primary">₹{selectedVisit.doctor_share.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Center Share</span>
                      <span className="font-medium text-success">₹{selectedVisit.center_share.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-primary/10">
                  <span className="text-sm text-muted-foreground">Received By</span>
                  <Badge variant={selectedVisit.fees_received_by === 'CENTER' ? 'default' : 'secondary'}>
                    {selectedVisit.fees_received_by === 'CENTER' ? 'Center' : 'Doctor'}
                  </Badge>
                </div>
                <div className="flex justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Created At</span>
                  <span>{format(new Date(selectedVisit.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/visits/edit/${selectedVisit.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Record
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!visitToDelete} onOpenChange={() => setVisitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visit record for{' '}
              <span className="font-medium">{visitToDelete?.patient?.name || 'Unknown'}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVisit}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
