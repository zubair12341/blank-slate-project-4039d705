import { useEffect, useMemo, useState } from 'react';
import { Search, WalletCards, ReceiptText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Customer = { id:string; name:string; phone:string|null };
type OrderRow = { id:string; order_number:string; customer_id:string|null; customer_name:string|null; total:number; payment_status:string; status:string; created_at:string };
type ReceiptRow = { id:string; customer_id:string; amount:number; payment_method:string; received_at:string; notes:string|null };

export default function CustomerLedger() {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [orders,setOrders]=useState<OrderRow[]>([]);
  const [receipts,setReceipts]=useState<ReceiptRow[]>([]);
  const [query,setQuery]=useState('');
  const [active,setActive]=useState<Customer|null>(null);
  const [amount,setAmount]=useState('');
  const [method,setMethod]=useState('cash');
  const load=async()=>{
    const [c,o,r]=await Promise.all([
      supabase.from('customers' as any).select('id,name,phone').order('name'),
      supabase.from('orders').select('id,order_number,customer_id,customer_name,total,payment_status,status,created_at').not('customer_name','is',null).order('created_at',{ascending:false}),
      supabase.from('customer_receipts' as any).select('id,customer_id,amount,payment_method,received_at,notes').order('received_at',{ascending:false})
    ]);
    if(c.error||o.error||r.error){ toast.error('Failed to load customer ledger'); return; }
    setCustomers((c.data||[]) as any); setOrders((o.data||[]) as any); setReceipts((r.data||[]) as any);
  };
  useEffect(()=>{void load()},[]);
  const customerOrders=(customer:Customer)=>orders.filter(o=>o.customer_id===customer.id || (!o.customer_id && o.customer_name?.trim().toLowerCase()===customer.name.trim().toLowerCase()));
  const balance=(customer:Customer)=>{
    const bills=customerOrders(customer).filter(o=>o.status!=='cancelled'&&o.status!=='refunded'&&o.payment_status!=='paid'&&o.payment_status!=='refunded').reduce((s,o)=>s+Number(o.total),0);
    const received=receipts.filter(r=>r.customer_id===customer.id).reduce((s,r)=>s+Number(r.amount),0);
    return Math.max(0,bills-received);
  };
  const filtered=customers.filter(c=>c.name.toLowerCase().includes(query.toLowerCase()) || (c.phone||'').includes(query));
  const record=async()=>{
    if(!active||Number(amount)<=0)return;
    const {error}=await supabase.from('customer_receipts' as any).insert({customer_id:active.id,amount:Number(amount),payment_method:method});
    if(error){toast.error('Failed to record receiving');return}
    toast.success('Customer receiving recorded'); setAmount(''); await load();
  };
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Customer Ledger</h1><p className="text-muted-foreground">Customer bills, unpaid balances and receivings.</p></div>
    <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search customer..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map(customer=>{
      const b=balance(customer), bills=customerOrders(customer);
      return <button key={customer.id} onClick={()=>setActive(customer)} className="rounded-xl border bg-card p-4 text-left hover:border-primary">
        <div className="flex items-start justify-between"><div><div className="font-semibold text-lg">{customer.name}</div><div className="text-sm text-muted-foreground">{customer.phone||'No phone'}</div></div><WalletCards className="h-5 w-5 text-primary"/></div>
        <div className="mt-4 flex justify-between text-sm"><span>{bills.length} bills</span><span className={b>0?'font-bold text-destructive':'font-bold text-green-600'}>Balance: Rs. {b.toLocaleString()}</span></div>
      </button>
    })}</div>
    <Dialog open={!!active} onOpenChange={open=>!open&&setActive(null)}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{active?.name} — Statement</DialogTitle></DialogHeader>
      {active&&<div className="space-y-4">
        <div className="rounded-lg bg-muted p-3 flex justify-between font-semibold"><span>Outstanding Balance</span><span>Rs. {balance(active).toLocaleString()}</span></div>
        <div className="space-y-2">{customerOrders(active).map(o=><div key={o.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div><div className="font-medium">{o.order_number}</div><div className="text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div></div><div className="text-right"><div className="font-semibold">Rs. {Number(o.total).toLocaleString()}</div><div className="capitalize">{o.payment_status}</div></div></div>)}</div>
        <div className="border-t pt-4"><h3 className="font-semibold mb-2">Receive Payment</h3><div className="grid grid-cols-[1fr_130px_auto] gap-2"><Input type="number" min="1" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)}/><select className="rounded-md border bg-background px-3" value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="mobile">Mobile</option></select><Button onClick={record}>Receive</Button></div></div>
        {receipts.filter(r=>r.customer_id===active.id).length>0&&<div className="border-t pt-4"><h3 className="font-semibold mb-2 flex gap-2 items-center"><ReceiptText className="h-4 w-4"/>Receivings</h3>{receipts.filter(r=>r.customer_id===active.id).map(r=><div key={r.id} className="flex justify-between py-2 text-sm border-b"><span>{new Date(r.received_at).toLocaleString()} · {r.payment_method}</span><span className="font-semibold text-green-600">Rs. {Number(r.amount).toLocaleString()}</span></div>)}</div>}
      </div>}
      <DialogFooter><Button variant="outline" onClick={()=>setActive(null)}>Close</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}
