import { useState, useEffect } from 'react';
import { Plus, Banknote, Calendar, Search, Trash2, TrendingDown, Receipt, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

const expenseCategories = [
  { value: 'wages', label: 'Wages & Salaries' },
  { value: 'utilities', label: 'Utilities (Electricity, Gas, Water)' },
  { value: 'supplies', label: 'Kitchen Supplies' },
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'transport', label: 'Transport & Delivery' },
  { value: 'other', label: 'Other Expenses' },
];

export default function DailyCosts() {
  const { user, hasPermission } = useAuth();
  const { settings, getTodaysSales } = useRestaurant();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const todaysSales = getTodaysSales();
  const formatPrice = (price: number) => `${settings.currencySymbol} ${price.toLocaleString()}`;

  useEffect(() => {
    fetchExpenses();
  }, [selectedDate]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('expense_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setForm({
        category: expense.category,
        description: expense.description || '',
        amount: expense.amount.toString(),
        expense_date: expense.expense_date,
      });
    } else {
      setEditingExpense(null);
      setForm({ category: '', description: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
    }
    setShowDialog(true);
  };

  const handleSaveExpense = async () => {
    if (!form.category || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update({
            category: form.category,
            description: form.description || null,
            amount,
            expense_date: form.expense_date,
          })
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Expense updated successfully');
      } else {
        // Add new expense
        const { error } = await supabase.from('expenses').insert({
          category: form.category,
          description: form.description || null,
          amount,
          expense_date: form.expense_date,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success('Expense added successfully');
      }

      setShowDialog(false);
      setEditingExpense(null);
      setForm({ category: '', description: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!hasPermission('admin')) {
      toast.error('Only admins can delete expenses');
      return;
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netProfit = todaysSales.revenue - todaysSales.cost - totalExpenses;

  const filteredExpenses = expenses.filter((exp) =>
    exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (value: string) => 
    expenseCategories.find((c) => c.value === value)?.label || value;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Daily Costs & Expenses</h1>
        <p className="page-subtitle">Track and manage daily operational expenses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">{formatPrice(todaysSales.revenue)}</p>
              </div>
              <Banknote className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Food Cost</p>
                <p className="text-2xl font-bold">{formatPrice(todaysSales.cost)}</p>
              </div>
              <Receipt className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">{formatPrice(totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className={`stat-card ${netProfit >= 0 ? 'stat-card-success' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Net Profit</p>
                <p className="text-2xl font-bold">{formatPrice(netProfit)}</p>
              </div>
              <Banknote className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 w-44"
            />
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Expenses List */}
      <Card className="section-card">
        <CardHeader>
          <CardTitle>Expenses for {format(new Date(selectedDate), 'MMMM d, yyyy')}</CardTitle>
          <CardDescription>{filteredExpenses.length} expense(s) recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded for this date
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <span className="font-medium">{getCategoryLabel(expense.category)}</span>
                      </td>
                      <td className="text-muted-foreground">
                        {expense.description || '-'}
                      </td>
                      <td className="text-right font-medium text-destructive">
                        -{formatPrice(Number(expense.amount))}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {(hasPermission('admin') || hasPermission('manager')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(expense)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('admin') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Monthly electricity bill"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Amount ({settings.currencySymbol}) *</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveExpense}>{editingExpense ? 'Update' : 'Add'} Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}