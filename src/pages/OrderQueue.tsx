import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ReceiptText, Clock, CheckCircle2, Edit3 } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Order } from '@/types/restaurant';
import { toast } from 'sonner';

const isActive=(o:Order)=>!['completed','cancelled','refunded'].includes(o.status)&&!['completed','cancelled','refunded'].includes(o.operationalStatus||'')&&!['paid','refunded'].includes(o.paymentStatus||'unpaid');
const typeOf=(o:Order)=>o.fulfillmentType||(o.orderType==='online'?'takeaway':o.orderType);
const statusOf=(o:Order)=>(o.operationalStatus||o.status||'open').replaceAll('_',' ');
const age=(d:Date)=>{const m=Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/60000));return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`;};

export default function OrderQueue(){
 const navigate=useNavigate(); const {orders,settings,settleOrder}=useRestaurant();
 const [search,setSearch]=useState(''),[type,setType]=useState('all'),[payment,setPayment]=useState('all'),[selected,setSelected]=useState<Order|null>(null),[method,setMethod]=useState<'cash'|'card'|'mobile'>('cash'),[settling,setSettling]=useState(false);
 const active=useMemo(()=>orders.filter(isActive).filter(o=>{
   const q=search.trim().toLowerCase(),t=typeOf(o);
   return(type==='all'||t===type)&&(payment==='all'||(o.paymentStatus||'unpaid')===payment)&&(!q||[o.orderNumber,o.customerName,o.waiterName,o.tableNumber].some(v=>String(v||'').toLowerCase().includes(q)));
 }).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()),[orders,search,type,payment]);
 const totals={all:orders.filter(isActive).length,dine:orders.filter(o=>isActive(o)&&typeOf(o)==='dine-in').length,take:orders.filter(o=>isActive(o)&&typeOf(o)==='takeaway').length,delivery:orders.filter(o=>isActive(o)&&typeOf(o)==='delivery').length};
 const edit=(o:Order)=>navigate('/pos',{state:{orderId:o.id,orderType:o.orderType==='online'?'online':typeOf(o),editMode:true}});
 const openPayment=(o:Order)=>{setSelected(o);setMethod(o.paymentMethod||'cash');};
 const settle=async()=>{if(!selected)return;setSettling(true);try{await settleOrder(selected.id,method,selected.tableId);toast.success(`${selected.orderNumber} paid and closed`);setSelected(null);}catch(e){toast.error(e instanceof Error?e.message:'Failed to settle order');}finally{setSettling(false);}};
 return <div className="space-y-6 animate-fade-in">
  <div><h1 className="text-2xl font-bold">Order Queue</h1><p className="text-muted-foreground">One live queue for every open restaurant order.</p></div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   {[['Open Orders',totals.all],['Dine-In',totals.dine],['Takeaway',totals.take],['Delivery',totals.delivery]].map(([label,value])=><Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>)}
  </div>
  <Card><CardContent className="pt-6"><div className="grid gap-3 md:grid-cols-3">
   <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Order, customer, waiter or table..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Order Types</SelectItem><SelectItem value="dine-in">Dine-In</SelectItem><SelectItem value="takeaway">Takeaway</SelectItem><SelectItem value="delivery">Delivery</SelectItem></SelectContent></Select>
   <Select value={payment} onValueChange={setPayment}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Payment States</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="partially_paid">Partially Paid</SelectItem></SelectContent></Select>
  </div></CardContent></Card>
  <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr>{['Age','Order','Type','Table / Customer','Waiter','Items','Status','Payment','Total','Actions'].map(h=><th key={h} className="p-3 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
   {active.length===0?<tr><td colSpan={10} className="p-10 text-center text-muted-foreground"><ReceiptText className="mx-auto mb-2 h-7 w-7"/>No open orders match these filters.</td></tr>:active.map(o=><tr key={o.id} className="border-b last:border-0">
    <td className="p-3 whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{age(o.createdAt)}</span></td><td className="p-3 font-mono font-semibold">{o.orderNumber}</td>
    <td className="p-3 capitalize">{typeOf(o)}</td><td className="p-3">{o.tableNumber?`Table ${o.tableNumber}`:o.customerName||'-'}</td><td className="p-3">{o.waiterName||'-'}</td><td className="p-3">{o.items.reduce((s,i)=>s+Number(i.finalQuantity??i.quantity),0)}</td>
    <td className="p-3 capitalize">{statusOf(o)}</td><td className="p-3 capitalize">{(o.paymentStatus||'unpaid').replaceAll('_',' ')}</td><td className="p-3 font-semibold">{settings.currencySymbol} {Number(o.total).toLocaleString()}</td>
    <td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>edit(o)}><Edit3 className="mr-1 h-4 w-4"/>Edit</Button><Button size="sm" onClick={()=>openPayment(o)}><CheckCircle2 className="mr-1 h-4 w-4"/>Payment</Button></div></td>
   </tr>)}
  </tbody></table></CardContent></Card>
  <Dialog open={!!selected} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Payment / Close Order</DialogTitle><DialogDescription>{selected?.orderNumber} · {settings.currencySymbol} {Number(selected?.total||0).toLocaleString()}</DialogDescription></DialogHeader>
   <div className="space-y-3 py-3"><Label>Payment Method</Label><RadioGroup value={method} onValueChange={v=>setMethod(v as typeof method)} className="grid grid-cols-3 gap-2">{['cash','card','mobile'].map(v=><Label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 capitalize"><RadioGroupItem value={v}/>{v}</Label>)}</RadioGroup></div>
   <DialogFooter><Button variant="outline" onClick={()=>setSelected(null)}>Cancel</Button><Button disabled={settling} onClick={()=>void settle()}>{settling?'Processing...':'Mark Paid & Close'}</Button></DialogFooter>
  </DialogContent></Dialog>
 </div>;
}