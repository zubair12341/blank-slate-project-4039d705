import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, ChefHat, Shield, ShieldCheck, AlertCircle, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Table, Waiter } from '@/types/restaurant';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { supabase } from '@/integrations/supabase/client';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'manager' | 'pos_user' | 'waiter';
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagement() {
  const {
    tables, waiters,
    addTable, updateTable, deleteTable,
    addWaiter, updateWaiter, deleteWaiter,
  } = useRestaurant();
  const { userRole } = useAuth();

  // Table state
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState({ number: '', capacity: '', floor: 'ground' as 'ground' | 'first' | 'family' });

  // Waiter state
  const [showWaiterDialog, setShowWaiterDialog] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '', isActive: true });

  // Staff state
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'pos_user' as 'admin' | 'manager' | 'pos_user' | 'waiter', waiterId: '',
  });
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<StaffUser | null>(null);
  const [assignmentWaiter, setAssignmentWaiter] = useState<Waiter | null>(null);
  const [assignedTableIds, setAssignedTableIds] = useState<string[]>([]);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  
  // Delete confirmation state
  const [deleteTableTarget, setDeleteTableTarget] = useState<Table | null>(null);
  const [deleteWaiterTarget, setDeleteWaiterTarget] = useState<Waiter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch staff users
  const fetchStaff = useCallback(async () => {
    if (userRole !== 'admin') return;
    setStaffLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.staff) setStaffUsers(data.staff);
    } catch (err: any) {
      console.error('Failed to fetch staff:', err);
      toast.error('Failed to load staff users');
    } finally {
      setStaffLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Create staff user
  const handleCreateStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim() || !staffForm.password.trim()) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (staffForm.role === 'waiter' && !staffForm.waiterId) {
      toast.error('Select the waiter profile to link with this login');
      return;
    }
    if (staffForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setStaffSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'create',
          email: staffForm.email,
          password: staffForm.password,
          name: staffForm.name,
          phone: staffForm.phone || null,
          role: staffForm.role,
          waiterId: staffForm.role === 'waiter' ? staffForm.waiterId : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Staff user created successfully');
      setShowStaffDialog(false);
      setStaffForm({ name: '', email: '', password: '', phone: '', role: 'pos_user', waiterId: '' });
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff user');
    } finally {
      setStaffSaving(false);
    }
  };

  // Delete staff user
  const handleDeleteStaffConfirm = async () => {
    if (!deleteStaffTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'delete', userId: deleteStaffTarget.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Staff user deleted');
      setDeleteStaffTarget(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Table handlers
  const handleOpenTableDialog = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setTableForm({ number: table.number.toString(), capacity: table.capacity.toString(), floor: table.floor });
    } else {
      setEditingTable(null);
      setTableForm({ number: '', capacity: '4', floor: 'ground' });
    }
    setShowTableDialog(true);
  };

  const handleSaveTable = async () => {
    const number = parseInt(tableForm.number);
    const capacity = parseInt(tableForm.capacity);
    
    if (isNaN(number) || number <= 0) {
      toast.error('Please enter a valid table number');
      return;
    }
    if (isNaN(capacity) || capacity <= 0) {
      toast.error('Please enter a valid capacity');
      return;
    }

    if (editingTable) {
      await updateTable(editingTable.id, { number, capacity, floor: tableForm.floor });
      toast.success('Table updated');
    } else {
      await addTable({ number, capacity, floor: tableForm.floor });
      toast.success('Table added');
    }
    setShowTableDialog(false);
  };

  const handleDeleteTable = (table: Table) => {
    if (table.status === 'occupied') {
      toast.error('Cannot delete occupied table');
      return;
    }
    setDeleteTableTarget(table);
  };
  
  const handleDeleteTableConfirm = async () => {
    if (!deleteTableTarget) return;
    setIsDeleting(true);
    try {
      await deleteTable(deleteTableTarget.id);
      toast.success('Table deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTableTarget(null);
    }
  };
  
  const handleDeleteWaiter = (waiter: Waiter) => {
    setDeleteWaiterTarget(waiter);
  };
  
  const handleDeleteWaiterConfirm = async () => {
    if (!deleteWaiterTarget) return;
    setIsDeleting(true);
    try {
      await deleteWaiter(deleteWaiterTarget.id);
      toast.success('Waiter deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
      setDeleteWaiterTarget(null);
    }
  };

  const openAssignments = async (waiter: Waiter) => {
    setAssignmentWaiter(waiter);
    const { data, error } = await supabase
      .from('waiter_table_assignments' as any)
      .select('table_id')
      .eq('waiter_id', waiter.id)
      .eq('is_active', true);
    if (error) {
      toast.error('Could not load table assignments');
      return;
    }
    setAssignedTableIds((data || []).map((row: any) => String(row.table_id)));
  };

  const saveAssignments = async () => {
    if (!assignmentWaiter) return;
    setAssignmentSaving(true);
    try {
      const { error: disableError } = await supabase
        .from('waiter_table_assignments' as any)
        .update({ is_active: false } as any)
        .eq('waiter_id', assignmentWaiter.id);
      if (disableError) throw disableError;

      for (const tableId of assignedTableIds) {
        const { error } = await supabase
          .from('waiter_table_assignments' as any)
          .upsert({ waiter_id: assignmentWaiter.id, table_id: tableId, is_active: true } as any, { onConflict: 'waiter_id,table_id' });
        if (error) throw error;
      }
      toast.success('Waiter table assignments saved');
      setAssignmentWaiter(null);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save assignments');
    } finally {
      setAssignmentSaving(false);
    }
  };

  // Waiter handlers
  const handleOpenWaiterDialog = (waiter?: Waiter) => {
    if (waiter) {
      setEditingWaiter(waiter);
      setWaiterForm({ name: waiter.name, phone: waiter.phone, isActive: waiter.isActive });
    } else {
      setEditingWaiter(null);
      setWaiterForm({ name: '', phone: '', isActive: true });
    }
    setShowWaiterDialog(true);
  };

  const handleSaveWaiter = async () => {
    if (!waiterForm.name.trim()) {
      toast.error('Please enter waiter name');
      return;
    }

    if (editingWaiter) {
      await updateWaiter(editingWaiter.id, waiterForm);
      toast.success('Waiter updated');
    } else {
      await addWaiter(waiterForm);
      toast.success('Waiter added');
    }
    setShowWaiterDialog(false);
  };

  const getFloorLabel = (floor: 'ground' | 'first' | 'family') => {
    switch (floor) {
      case 'ground': return 'Ground Floor';
      case 'first': return 'First Floor';
      case 'family': return 'Family Hall';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive"><ShieldCheck className="h-3 w-3" /> Admin</span>;
      case 'manager':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning"><Shield className="h-3 w-3" /> Manager</span>;
      case 'waiter':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><ChefHat className="h-3 w-3" /> Waiter</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"><Users className="h-3 w-3" /> POS User</span>;
    }
  };

  // Table Card Component
  const TableCard = ({ table, onEdit, onDelete }: { table: Table; onEdit: (t: Table) => void; onDelete: (t: Table) => void }) => (
    <div
      className={`relative rounded-xl border-2 p-4 ${
        table.status === 'occupied'
          ? 'border-destructive bg-destructive/5'
          : 'border-success bg-success/5'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold">Table {table.number}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          table.status === 'occupied' ? 'bg-destructive text-destructive-foreground' : 'bg-success text-success-foreground'
        }`}>
          {table.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-1">Capacity: {table.capacity} seats</p>
      <p className="text-xs text-muted-foreground mb-3">{getFloorLabel(table.floor)}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(table)}>
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={table.status === 'occupied'}
          onClick={() => onDelete(table)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Staff Management</h1>
        <p className="page-subtitle">Manage tables, waiters, and staff members</p>
      </div>

      <Tabs defaultValue="tables" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="waiters">Waiters</TabsTrigger>
          <TabsTrigger value="staff">Staff & Users</TabsTrigger>
        </TabsList>

        {/* Tables Tab */}
        <TabsContent value="tables">
          <Card className="section-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Restaurant Tables</CardTitle>
                <CardDescription>Manage dining tables and capacity</CardDescription>
              </div>
              <Button onClick={() => handleOpenTableDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Table
              </Button>
            </CardHeader>
            <CardContent>
              {/* Ground Floor */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Ground Floor
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {tables
                    .filter((t) => t.floor === 'ground')
                    .sort((a, b) => a.number - b.number)
                    .map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onEdit={handleOpenTableDialog}
                        onDelete={handleDeleteTable}
                      />
                    ))}
                </div>
              </div>

              {/* First Floor */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  First Floor
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {tables
                    .filter((t) => t.floor === 'first')
                    .sort((a, b) => a.number - b.number)
                    .map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onEdit={handleOpenTableDialog}
                        onDelete={handleDeleteTable}
                      />
                    ))}
                </div>
              </div>

              {/* Family Hall */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Family Hall
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {tables
                    .filter((t) => t.floor === 'family')
                    .sort((a, b) => a.number - b.number)
                    .map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onEdit={handleOpenTableDialog}
                        onDelete={handleDeleteTable}
                      />
                    ))}
                </div>
              </div>

              {tables.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tables configured. Add your first table.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waiters Tab */}
        <TabsContent value="waiters">
          <Card className="section-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Waiters</CardTitle>
                <CardDescription>Manage restaurant waiters</CardDescription>
              </div>
              <Button onClick={() => handleOpenWaiterDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Waiter
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Login</th>
                      <th>Assigned Tables</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waiters.map((waiter) => (
                      <tr key={waiter.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <ChefHat className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{waiter.name}</span>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{waiter.phone}</td>
                        <td>
                          <span className={waiter.isActive ? 'badge-success' : 'badge-destructive'}>
                            {waiter.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm">{waiter.userId ? <span className="text-green-600 font-medium">Linked</span> : <span className="text-muted-foreground">Not linked</span>}</td>
                        <td>
                          <Button variant="outline" size="sm" onClick={() => void openAssignments(waiter)}>
                            Assign Tables
                          </Button>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenWaiterDialog(waiter)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteWaiter(waiter)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {waiters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No waiters added yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff & Users Tab */}
        <TabsContent value="staff">
          <Card className="section-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff & Users
                </CardTitle>
                <CardDescription>Manage admins, managers, and POS users</CardDescription>
              </div>
              {userRole === 'admin' && (
                <Button
                  onClick={() => {
                    setStaffForm({ name: '', email: '', password: '', phone: '', role: 'pos_user', waiterId: '' });
                    setShowPassword(false);
                    setShowStaffDialog(true);
                  }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Staff User
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {userRole !== 'admin' ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Admin Access Required</AlertTitle>
                  <AlertDescription>
                    Only administrators can manage staff users. Contact your admin.
                  </AlertDescription>
                </Alert>
              ) : staffLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Role Legend */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <ShieldCheck className="h-5 w-5 text-destructive" />
                        </div>
                        <span className="font-semibold">Admin</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full access including staff management and settings.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <Shield className="h-5 w-5 text-warning" />
                        </div>
                        <span className="font-semibold">Manager</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Operational access: POS, menu, stock, orders, reports.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold">POS User</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Limited to POS operations and viewing orders only.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-green-100">
                          <ChefHat className="h-5 w-5 text-green-700" />
                        </div>
                        <span className="font-semibold">Waiter</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        POS-only login restricted to assigned tables; can place and add items only.
                      </p>
                    </div>
                  </div>

                  {/* Staff Users Table */}
                  <div className="overflow-hidden rounded-lg border">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsers.map((staff) => (
                          <tr key={staff.id}>
                            <td>
                              <span className="font-medium">{staff.name}</span>
                            </td>
                            <td className="text-muted-foreground">{staff.email}</td>
                            <td className="text-muted-foreground">{staff.phone || '—'}</td>
                            <td>{getRoleBadge(staff.role)}</td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteStaffTarget(staff)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {staffUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No staff users found.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="table-number">Table Number</Label>
              <Input
                id="table-number"
                type="number"
                min="1"
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-capacity">Capacity (seats)</Label>
              <Input
                id="table-capacity"
                type="number"
                min="1"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Select value={tableForm.floor} onValueChange={(v: 'ground' | 'first' | 'family') => setTableForm({ ...tableForm, floor: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ground">Ground Floor</SelectItem>
                  <SelectItem value="first">First Floor</SelectItem>
                  <SelectItem value="family">Family Hall</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTable}>{editingTable ? 'Update' : 'Add'} Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiter Dialog */}
      <Dialog open={showWaiterDialog} onOpenChange={setShowWaiterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWaiter ? 'Edit Waiter' : 'Add Waiter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="waiter-name">Name</Label>
              <Input
                id="waiter-name"
                value={waiterForm.name}
                onChange={(e) => setWaiterForm({ ...waiterForm, name: e.target.value })}
                placeholder="Muhammad Ali"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waiter-phone">Phone</Label>
              <Input
                id="waiter-phone"
                value={waiterForm.phone}
                onChange={(e) => setWaiterForm({ ...waiterForm, phone: e.target.value })}
                placeholder="+92 300 1234567"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={waiterForm.isActive}
                onCheckedChange={(checked) => setWaiterForm({ ...waiterForm, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaiterDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveWaiter}>{editingWaiter ? 'Update' : 'Add'} Waiter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiter Table Assignment Dialog */}
      <Dialog open={!!assignmentWaiter} onOpenChange={(open) => !open && setAssignmentWaiter(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Tables — {assignmentWaiter?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This waiter will only be able to see and order on the selected tables.</p>
          <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto py-2 sm:grid-cols-3">
            {tables.slice().sort((a,b) => a.number-b.number).map((table) => {
              const checked = assignedTableIds.includes(table.id);
              return (
                <label key={table.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${checked ? 'border-primary bg-primary/5' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={(event) => {
                    setAssignedTableIds((prev) => event.target.checked ? [...prev, table.id] : prev.filter((id) => id !== table.id));
                  }} />
                  <span className="font-medium">Table {table.number}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentWaiter(null)}>Cancel</Button>
            <Button onClick={() => void saveAssignments()} disabled={assignmentSaving}>
              {assignmentSaving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Staff Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Staff User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name *</Label>
              <Input
                id="staff-name"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="Muhammad Ali"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="staff@dhaba.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password *</Label>
              <div className="relative">
                <Input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="+92 300 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={staffForm.role} onValueChange={(v: 'admin' | 'manager' | 'pos_user' | 'waiter') => setStaffForm({ ...staffForm, role: v, waiterId: v === 'waiter' ? staffForm.waiterId : '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-destructive" /> Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="manager">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-warning" /> Manager
                    </span>
                  </SelectItem>
                  <SelectItem value="pos_user">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> POS User
                    </span>
                  </SelectItem>
                  <SelectItem value="waiter">
                    <span className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-green-600" /> Waiter
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {staffForm.role === 'waiter' && (
              <div className="space-y-2">
                <Label>Link Waiter Profile *</Label>
                <Select value={staffForm.waiterId} onValueChange={(waiterId) => setStaffForm({ ...staffForm, waiterId })}>
                  <SelectTrigger><SelectValue placeholder="Select waiter" /></SelectTrigger>
                  <SelectContent>
                    {waiters.filter((waiter) => waiter.isActive && !waiter.userId).map((waiter) => (
                      <SelectItem key={waiter.id} value={waiter.id}>{waiter.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Create the waiter profile first, then link this login to it.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStaffDialog(false) disabled={staffSaving}>Cancel</Button>
            <Button onClick={handleCreateStaff} disabled={staffSaving} className="gap-2">
              {staffSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {staffSaving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Table Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTableTarget}
        onOpenChange={(open) => !open && setDeleteTableTarget(null)}
        title="Delete Table?"
        itemName={deleteTableTarget ? `Table ${deleteTableTarget.number}` : undefined}
        onConfirm={handleDeleteTableConfirm}
        isLoading={isDeleting}
      />
      
      {/* Delete Waiter Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteWaiterTarget}
        onOpenChange={(open) => !open && setDeleteWaiterTarget(null)}
        title="Delete Waiter?"
        itemName={deleteWaiterTarget?.name}
        onConfirm={handleDeleteWaiterConfirm}
        isLoading={isDeleting}
      />

      {/* Delete Staff Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteStaffTarget}
        onOpenChange={(open) => !open && setDeleteStaffTarget(null)}
        title="Delete Staff User?"
        itemName={deleteStaffTarget ? `${deleteStaffTarget.name} (${deleteStaffTarget.email})` : undefined}
        onConfirm={handleDeleteStaffConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
