import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body =
  | { action: "occupy"; tableId: string; orderId: string }
  | { action: "free"; tableId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: permitted } = await admin.rpc("has_permission", { _user_id: user.id, _permission_key: "order.edit" });
    const { data: createPermitted } = await admin.rpc("has_permission", { _user_id: user.id, _permission_key: "order.create" });
    if (!permitted && !createPermitted) return new Response(JSON.stringify({ error: "Order/table update permission required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = (await req.json()) as Body;
    if (!body?.tableId) return new Response(JSON.stringify({ error: "tableId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (body.action === "occupy" && !body.orderId) return new Response(JSON.stringify({ error: "orderId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const update = body.action === "occupy"
      ? { status: "occupied", current_order_id: body.orderId }
      : body.action === "free"
        ? { status: "available", current_order_id: null }
        : null;
    if (!update) return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error } = await admin.from("restaurant_tables").update(update).eq("id", body.tableId);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
