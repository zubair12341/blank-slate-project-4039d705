import { useEffect, useMemo, useState } from 'react';
import { Bike, CheckCircle2, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { transitionOrderStatus } from '@/services/orderWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Order } from '@/types/restaurant';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Rider={id:string;name:string;phone?:string|null;is_active:boolean};
const isDelivery=(o:Order)=>o.fulfillmentType==='delivery'||o.orderType==='online'||o.orderChannel==='online';
const isOpen=(o:Order)=>isDelivery(o)&&!['completed','cancelled','refunded'].includes(o.status)&&!['paid','refunded'].includes(o.paymentStatus||'unpaid');

export default function DeliveryOrders(){
 const {orders,settings,settleOrder}=useRestaurant();const [riders,setRiders]=useState<Rider[]>([]);const [busy,setBusy]=useState<string|null>(null);const [showRider,setShowRider]=useState(false);const [riderName,setRiderName]=useState('');const [riderPhone,setRiderPhone]=useState('');
 const loadRiders=()=>supabase.from('riders' as any).select('id,name,phone,is_active').eq('is_active',true).order('name').then(({data})=>setRiders((data||[]) as any));useEffect(()=>{void loadRiders();},[]);
 const list=useMemo(()=>orders.filter(isOpen).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()),[orders]);
 const assign=async(o:Order,riderId:string)=>{setBusy(o.id);try{const {error}=await (supabase.rpc as any)('assign_order_rider',{p_order_id:o.id,p_rider_id:riderId});if(error)throw error;toast.success('Rider assigned');}catch(e){toast.error(e instanceof Error?e.message:'Failed to assign rider');}finally{setBusy(null);}};
 const addRider=async()=>{if(!riderName.trim())return;try{const {error}=await supabase.from('riders' as any).insert({name:riderName.trim(),phone:riderPhone.trim()||null} as any);if(error)throw error;await loadRiders();setRiderName('');setRiderPhone('');setShowRider(false);toast.success('Rider added');}catch(e){toast.error(e instanceof Error?e.message:'Failed to add rider');}};
 const move=async(o:Order,next:'in_progress'|'ready'|'delivered')=>{setBusy(o.id);try{if(next==='delivered'&&!(o as any).riderId)throw new Error('Assign a rider before marking delivered');await transitionOrderStatus({orderId:o.id,newStatus:next,expectedVersion:o.version,sourceDevice:'POS'});toast.success(`${o.orderNumber} marked ${next.replace('_',' ')}`);}catch(e){toast.error(e instanceof Error?e.message:'Failed to update delivery');}finally{setBusy(null);}};
 return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Delivery & Riders</h1><p className="text-muted-foreground">Prepare, assign and complete delivery orders.</p></div><Button variant="outline" onClick={()=>setShowRider(true)}>+ Add Rider</Button></div>
  <div className="grid gap-3 sm:grid-cols-3">{[['Open',list.length],['Ready',list.filter(o=>o.operationalStatus==='ready').length],['Out / Assigned',list.filter(o=>(o as any).riderId).length]].map(([k,v])=><Card key={String(k)}><CardHeader className="pb-2"><CardTitle className="text-sm">{k}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{v}</CardContent></Card>)}</div>
  <div className="grid gap-4 lg:grid-cols-2">{list.map(o=><Card key={o.id}><CardHeader><div className="flex items-center justify-between"><CardTitle className="font-mono">{o.orderNumber}</CardTitle><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{(o.operationalStatus||'in_progress').replace('_',' ')}</span></div></CardHeader><CardContent className="space-y-4">
   <div className="grid gap-2 text-sm"><div className="flex gap-2"><User className="h-4 w-4"/>{o.customerName||'Customer not set'}</div>{(o as any).customerPhone&&<div className="flex gap-2"><Phone className="h-4 w-4"/>{(o as any).customerPhone}</div>}{(o as any).deliveryAddress&&<div className="flex gap-2"><MapPin className="h-4 w-4"/>{(o as any).deliveryAddress}</div>}</div>
   <div className="flex justify-between border-t pt-3 font-semibold"><span>{o.items.reduce((s,i)=>s+Number(i.finalQuantity??i.quantity),0)} items</span><span>{settings.currencySymbol} {Number(o.total).toLocaleString()}</span></div>
   <div className="space-y-2"><div className="text-xs font-medium text-muted-foreground">Rider</div><Select disabled={busy===o.id} value={(o as any).riderId||''} onValueChange={v=>void assign(o,v)}><SelectTrigger><SelectValue placeholder="Assign rider"/></SelectTrigger><SelectContent>{riders.map(r=><SelectItem key={r.id} value={r.id}>{r.name}{r.phone?' · '+r.phone:''}</SelectItem>)}</SelectContent></Select>{(o as any).riderName&&<div className="flex items-center gap-2 text-sm"><Bike className="h-4 w-4"/>{(o as any).riderName}</div>}</div>
   <div className="flex flex-wrap gap-2">{(!o.operationalStatus||o.operationalStatus==='open')&&<Button disabled={busy===o.id} onClick={()=>void move(o,'in_progress')}>Start Preparing</Button>}{o.operationalStatus==='in_progress'&&<Button disabled={busy===o.id} onClick={()=>void move(o,'ready')}>Mark Ready</Button>}{o.operationalStatus==='ready'&&<Button disabled={busy===o.id} onClick={()=>void move(o,'delivered')}><CheckCircle2 className="mr-1 h-4 w-4"/>Mark Delivered</Button>}<Button variant="outline" disabled={busy===o.id} onClick={()=>void settleOrder(o.id,o.paymentMethod||'cash').catch(e=>toast.error(e instanceof Error?e.message:'Settlement failed'))}>Pay & Close</Button></div>
  </CardContent></Card>)}</div>{list.length===0&&<Card><CardContent className="p-10 text-center text-muted-foreground">No active delivery orders.</CardContent></Card>}
  <Dialog open={showRider} onOpenChange={setShowRider}><DialogContent><DialogHeader><DialogTitle>Add Rider</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Name</Label><Input value={riderName} onChange={e=>setRiderName(e.target.value)}/></div><div><Label>Phone</Label><Input value={riderPhone} onChange={e=>setRiderPhone(e.target.value)}/></div></div><DialogFooter><Button variant="outline" onClick={()=>setShowRider(false)}>Cancel</Button><Button onClick={()=>void addRider()}>Save Rider</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}