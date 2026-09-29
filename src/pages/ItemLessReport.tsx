import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Row = { id:string; order_id:string; order_item_id:string; quantity_less:number; amount_affected:number; reason_code:string; reason_details?:string|null; performed_by:string; inventory_disposition:string; created_at:string; orders?:{order_number?:string;table_number?:number|null;waiter_name?:string|null}|null; order_items?:{menu_item_name?:string;variant_name?:string|null}|null };
const reasons:Record<string,string>={customer_changed_mind:'Customer Changed Mind',wrong_item_entered:'Wrong Item Entered',item_unavailable:'Item Unavailable',duplicate_entry:'Duplicate Entry',kitchen_issue:'Kitchen Issue',customer_complaint:'Customer Complaint',other:'Other'};
const stock:Record<string,string>={not_prepared:'Not Prepared / Stock Restored',returned:'Returned / Stock Restored',waste:'Prepared / Waste'};

export default function ItemLessReport(){
 const [rows,setRows]=useState<Row[]>([]),[profiles,setProfiles]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true);
 const [from,setFrom]=useState(()=>new Date().toISOString().slice(0,10)),[to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
 const [reason,setReason]=useState('all'),[waiter,setWaiter]=useState('all'),[user,setUser]=useState('all'),[search,setSearch]=useState('');
 const load=async()=>{setLoading(true);try{
  const start=new Date(from+'T00:00:00').toISOString(),end=new Date(to+'T23:59:59.999').toISOString();
  const {data,error}=await supabase.from('item_less_events').select('*, orders(order_number,table_number,waiter_name), order_items(menu_item_name,variant_name)').gte('created_at',start).lte('created_at',end).order('created_at',{ascending:false});
  if(error)throw error; const list=(data||[]) as unknown as Row[]; setRows(list);
  const ids=[...new Set(list.map(x=>x.performed_by).filter(Boolean))];
  if(ids.length){const {data:p}=await supabase.from('profiles').select('user_id,name').in('user_id',ids);setProfiles(Object.fromEntries((p||[]).map(x=>[x.user_id,x.name])));}else setProfiles({});
 }catch(e){toast.error(e instanceof Error?e.message:'Failed to load Item Less report');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[from,to]);
 const waiters=useMemo(()=>[...new Set(rows.map(r=>r.orders?.waiter_name).filter(Boolean) as string[])].sort(),[rows]);
 const users=useMemo(()=>[...new Set(rows.map(r=>profiles[r.performed_by]||r.performed_by))].sort(),[rows,profiles]);
 const filtered=useMemo(()=>rows.filter(r=>{const q=search.trim().toLowerCase(),cashier=profiles[r.performed_by]||r.performed_by;return(reason==='all'||r.reason_code===reason)&&(waiter==='all'||r.orders?.waiter_name===waiter)&&(user==='all'||cashier===user)&&(!q||[r.orders?.order_number,r.orders?.table_number,r.order_items?.menu_item_name,r.order_items?.variant_name,r.reason_details,cashier].some(v=>String(v||'').toLowerCase().includes(q)));}),[rows,reason,waiter,user,search,profiles]);
 const qty=filtered.reduce((s,r)=>s+Number(r.quantity_less||0),0),value=filtered.reduce((s,r)=>s+Number(r.amount_affected||0),0);
 return <div className="space-y-6">
  <div><h1 className="text-2xl font-bold">Item Less Report</h1><p className="text-muted-foreground">Controlled record of quantities removed from saved orders.</p></div>
  <div className="grid gap-3 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{filtered.length}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Quantity Less</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{qty}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Value Affected</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rs. {value.toLocaleString()}</CardContent></Card></div>
  <Card><CardContent className="pt-6"><div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
   <Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Input type="date" value={to} onChange={e=>setTo(e.target.value)}/>
   <Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Reasons</SelectItem>{Object.entries(reasons).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
   <Select value={waiter} onValueChange={setWaiter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Waiters</SelectItem>{waiters.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
   <Select value={user} onValueChange={setUser}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All POS Users</SelectItem>{users.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
   <div className="flex gap-2"><Input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/><Button size="icon" variant="outline" onClick={()=>void load()}><RefreshCw className="h-4 w-4"/></Button></div>
  </div></CardContent></Card>
  <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr>{['Date / Time','Order','Table','Waiter','Item','Qty Less','Value','Reason','Stock Treatment','POS User'].map(h=><th key={h} className="p-3 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={10} className="p-8 text-center">Loading...</td></tr>:filtered.length===0?<tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No Item Less records for these filters.</td></tr>:filtered.map(r=><tr key={r.id} className="border-b last:border-0">
    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td><td className="p-3 font-medium">{r.orders?.order_number||'-'}</td><td className="p-3">{r.orders?.table_number||'-'}</td><td className="p-3">{r.orders?.waiter_name||'-'}</td>
    <td className="p-3">{r.order_items?.menu_item_name||'-'}{r.order_items?.variant_name?' ('+r.order_items.variant_name+')':''}</td><td className="p-3 font-semibold">{Number(r.quantity_less)}</td><td className="p-3">Rs. {Number(r.amount_affected).toLocaleString()}</td>
    <td className="p-3">{reasons[r.reason_code]||r.reason_code}{r.reason_details&&<div className="text-xs text-muted-foreground">{r.reason_details}</div>}</td><td className="p-3"><Badge variant={r.inventory_disposition==='waste'?'destructive':'secondary'}>{stock[r.inventory_disposition]||r.inventory_disposition}</Badge></td><td className="p-3">{profiles[r.performed_by]||r.performed_by.slice(0,8)}</td>
   </tr>)}
  </tbody></table></CardContent></Card>
 </div>;
}