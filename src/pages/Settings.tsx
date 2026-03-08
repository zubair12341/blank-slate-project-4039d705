import { useState, useRef } from 'react';
import { Save, Building, Bell, Plus, Trash2, FileText, Receipt, Lock, Eye, EyeOff, Clock, Upload, Image, Download, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { SecuritySettings } from '@/types/restaurant';
import { PasswordOTPInput } from '@/components/PasswordOTPInput';

export default function RestaurantSettings() {
  const {
    settings,
    menuCategories,
    ingredientCategories,
    updateSettings,
    updateInvoiceSettings,
    addMenuCategory,
    deleteMenuCategory,
    addIngredientCategory,
    deleteIngredientCategory,
  } = useRestaurant();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // General Settings
  const [restaurantName, setRestaurantName] = useState(settings.name);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [taxRate, setTaxRate] = useState(settings.taxRate.toString());
  
  // Business Day Settings
  const [cutoffHour, setCutoffHour] = useState(settings.businessDay?.cutoffHour?.toString() || '5');
  const [cutoffMinute, setCutoffMinute] = useState(settings.businessDay?.cutoffMinute?.toString() || '0');
  
  // Invoice Settings
  const [invoiceTitle, setInvoiceTitle] = useState(settings.invoice?.title || settings.name);
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoice?.footer || 'Thank you for dining with us!');
  const [showLogo, setShowLogo] = useState(settings.invoice?.showLogo ?? true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(settings.invoice?.showTaxBreakdown ?? true);
  const [gstEnabled, setGstEnabled] = useState(settings.invoice?.gstEnabled ?? true);
  const [logoUrl, setLogoUrl] = useState(settings.invoice?.logoUrl || '');

  // Security Settings
  const [cancelPassword, setCancelPassword] = useState(settings.security?.cancelOrderPassword || '12345');
  const [showPassword, setShowPassword] = useState(false);

  // Notifications
  const [lowStockAlert, setLowStockAlert] = useState(true);
  
  // Export state
  const [exportingSQL, setExportingSQL] = useState(false);
  const [exportingJSON, setExportingJSON] = useState(false);

  // Categories
  const [newMenuCategoryName, setNewMenuCategoryName] = useState('');
  const [newMenuCategoryIcon, setNewMenuCategoryIcon] = useState('🍽️');
  const [newIngredientCategoryName, setNewIngredientCategoryName] = useState('');

  const handleDownloadSQL = async () => {
    setExportingSQL(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-sql', { method: 'GET' });
      if (error) throw error;
      const content = typeof data === 'string' ? data : JSON.stringify(data);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_export_${new Date().toISOString().split('T')[0]}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('SQL export downloaded');
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingSQL(false);
    }
  };

  const handleDownloadJSON = async () => {
    setExportingJSON(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-database', { method: 'GET' });
      if (error) throw error;
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON export downloaded');
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingJSON(false);
    }
  };

  const handleSaveGeneralSettings = () => {
    updateSettings({
      name: restaurantName,
      address,
      phone,
      taxRate: parseFloat(taxRate) || 16,
      businessDay: {
        cutoffHour: parseInt(cutoffHour) || 5,
        cutoffMinute: parseInt(cutoffMinute) || 0,
      },
    });
    toast.success('General settings saved');
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('Logo file must be less than 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInvoiceSettings = () => {
    updateInvoiceSettings({
      title: invoiceTitle,
      footer: invoiceFooter,
      showLogo,
      showTaxBreakdown,
      gstEnabled,
      logoUrl,
    });
    toast.success('Invoice settings saved');
  };

  const handleSaveSecuritySettings = () => {
    if (cancelPassword.length !== 5 || !/^\d+$/.test(cancelPassword)) {
      toast.error('Password must be exactly 5 digits');
      return;
    }
    updateSettings({
      security: {
        cancelOrderPassword: cancelPassword,
      },
    });
    toast.success('Security settings saved');
  };

  const handleAddMenuCategory = () => {
    if (!newMenuCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    addMenuCategory({
      name: newMenuCategoryName,
      icon: newMenuCategoryIcon,
      color: '#f97316',
      sortOrder: menuCategories.length + 1,
    });
    setNewMenuCategoryName('');
    setNewMenuCategoryIcon('🍽️');
    toast.success('Menu category added');
  };

  const handleAddIngredientCategory = () => {
    if (!newIngredientCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    addIngredientCategory({ name: newIngredientCategoryName });
    setNewIngredientCategoryName('');
    toast.success('Ingredient category added');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your restaurant settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Restaurant Information
              </CardTitle>
              <CardDescription>Basic restaurant details and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Pakistani Dhaba"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Main Boulevard, Gulberg III, Lahore"
                  rows={2}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax Rate (GST %)</Label>
                  <Input
                    id="tax"
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="16"
                  />
                </div>
              </div>
              
              {/* Business Day Cutoff */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Business Day Cutoff Time</p>
                    <p className="text-sm text-muted-foreground">Orders after midnight but before this time are counted as previous day's sales</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="cutoff-hour">Hour (0-23)</Label>
                    <Select value={cutoffHour} onValueChange={setCutoffHour}>
                      <SelectTrigger id="cutoff-hour">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00 {i === 0 ? '(Midnight)' : 'AM'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cutoff-minute">Minute</Label>
                    <Select value={cutoffMinute} onValueChange={setCutoffMinute}>
                      <SelectTrigger id="cutoff-minute">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">00</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p>📅 Business day starts at <strong>{cutoffHour.padStart(2, '0')}:{cutoffMinute.padStart(2, '0')}</strong> and ends at the same time next day.</p>
                  <p className="mt-1">Example: With 5:00 AM cutoff, an order at 2:00 AM on Jan 15 will be counted as Jan 14's sales.</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p><strong>Currency:</strong> PKR (Pakistani Rupee)</p>
                <p><strong>Symbol:</strong> Rs.</p>
              </div>
              <Separator />
              <Button onClick={handleSaveGeneralSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save General Settings
              </Button>
            </CardContent>
          </Card>

          {/* Data Export Card */}
          <Card className="section-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>Download a complete copy of all your data for migration or backup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-medium">SQL Export</p>
                    <p className="text-sm text-muted-foreground">INSERT statements ready to run in a new database SQL Editor</p>
                  </div>
                  <Button onClick={handleDownloadSQL} disabled={exportingSQL} variant="outline" className="w-full gap-2">
                    {exportingSQL ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {exportingSQL ? 'Exporting...' : 'Download SQL'}
                  </Button>
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-medium">JSON Export</p>
                    <p className="text-sm text-muted-foreground">Complete data dump in JSON format for programmatic use</p>
                  </div>
                  <Button onClick={handleDownloadJSON} disabled={exportingJSON} variant="outline" className="w-full gap-2">
                    {exportingJSON ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {exportingJSON ? 'Exporting...' : 'Download JSON'}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>📦 Exports include all 14 tables: ingredients, menu categories, menu items, variants, orders, order items, waiters, tables, stock data, expenses, and settings.</p>
                <p className="mt-1">⚠️ User accounts and roles are NOT included (they are project-specific).</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice Customization
              </CardTitle>
              <CardDescription>Customize invoice appearance and content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-title">Invoice Title</Label>
                <Input
                  id="invoice-title"
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  placeholder="Pakistani Dhaba"
                />
                <p className="text-xs text-muted-foreground">This will appear at the top of the invoice</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-footer">Invoice Footer</Label>
                <Textarea
                  id="invoice-footer"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  placeholder="Thank you for dining with us! Visit again."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">This will appear at the bottom of the invoice</p>
              </div>
              <Separator />
              
              {/* Logo Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Restaurant Logo</p>
                    <p className="text-sm text-muted-foreground">Upload a logo to display on invoices (max 500KB)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <div className="w-20 h-20 rounded-lg border overflow-hidden bg-white flex items-center justify-center">
                      <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={() => logoInputRef.current?.click()} className="gap-2">
                      <Upload className="h-4 w-4" />
                      {logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    {logoUrl && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setLogoUrl('')}>
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Logo</p>
                    <p className="text-sm text-muted-foreground">Display restaurant logo on invoice</p>
                  </div>
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Tax Breakdown</p>
                    <p className="text-sm text-muted-foreground">Show GST details separately on invoice</p>
                  </div>
                  <Switch checked={showTaxBreakdown} onCheckedChange={setShowTaxBreakdown} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable GST</p>
                    <p className="text-sm text-muted-foreground">Apply GST tax to all orders</p>
                  </div>
                  <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                </div>
              </div>
              <Separator />

              {/* Invoice Preview */}
              <div className="space-y-2">
                <Label>Invoice Preview</Label>
                <div className="rounded-lg border bg-white p-4 text-center max-w-sm mx-auto">
                  {showLogo && logoUrl && (
                    <div className="mb-3 flex justify-center">
                      <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
                    </div>
                  )}
                  <h3 className="text-lg font-bold">{invoiceTitle || 'Restaurant Name'}</h3>
                  <p className="text-xs text-muted-foreground">{address}</p>
                  <p className="text-xs text-muted-foreground mb-2">Order: ORD-SAMPLE</p>
                  <div className="border-t border-b py-2 my-2 text-left text-sm">
                    <div className="flex justify-between">
                      <span>Item 1</span>
                      <span>Rs. 450</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Item 2</span>
                      <span>Rs. 550</span>
                    </div>
                  </div>
                  {showTaxBreakdown && gstEnabled && (
                    <div className="text-left text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>Rs. 1,000</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST ({taxRate}%)</span>
                        <span>Rs. {(1000 * (parseFloat(taxRate) || 16) / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>Rs. {gstEnabled ? (1000 * (1 + (parseFloat(taxRate) || 16) / 100)).toFixed(0) : '1,000'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 italic">{invoiceFooter}</p>
                </div>
              </div>

              <Button onClick={handleSaveInvoiceSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save Invoice Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Order Cancellation Password (5 digits)</Label>
                <PasswordOTPInput
                  value={cancelPassword}
                  onChange={(value) => setCancelPassword(value.replace(/\D/g, ''))}
                  length={5}
                />
                <p className="text-xs text-muted-foreground text-center">
                  This password is required to cancel any order from the Orders section. Only share with authorized staff.
                </p>
              </div>
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
                <p className="text-sm text-warning font-medium">⚠️ Important</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Any user with access to the POS or Orders section can cancel orders using this password. Keep it secure and change it regularly.
                </p>
              </div>
              <Separator />
              <Button onClick={handleSaveSecuritySettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Menu Categories */}
            <Card className="section-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Menu Categories
                </CardTitle>
                <CardDescription>Categories for food items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name"
                    value={newMenuCategoryName}
                    onChange={(e) => setNewMenuCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Icon"
                    value={newMenuCategoryIcon}
                    onChange={(e) => setNewMenuCategoryIcon(e.target.value)}
                    className="w-16 text-center"
                  />
                  <Button onClick={handleAddMenuCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {menuCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          deleteMenuCategory(cat.id);
                          toast.success('Category deleted');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ingredient Categories */}
            <Card className="section-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ingredient Categories
                </CardTitle>
                <CardDescription>Categories for ingredients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name"
                    value={newIngredientCategoryName}
                    onChange={(e) => setNewIngredientCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddIngredientCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ingredientCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="font-medium">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          deleteIngredientCategory(cat.id);
                          toast.success('Category deleted');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure alert preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when ingredients are low</p>
                </div>
                <Switch checked={lowStockAlert} onCheckedChange={setLowStockAlert} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Notifications</p>
                  <p className="text-sm text-muted-foreground">Sound alerts for new orders</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Reports</p>
                  <p className="text-sm text-muted-foreground">Receive daily sales summary</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}