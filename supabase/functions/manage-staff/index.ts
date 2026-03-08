import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check admin role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { action, ...payload } = await req.json();

    // LIST all staff users
    if (action === "list") {
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const users = usersData?.users || [];

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: profiles } = await adminClient.from("profiles").select("*");

      const staffList = users.map((u: any) => {
        const role = roles?.find((r: any) => r.user_id === u.id);
        const profile = profiles?.find((p: any) => p.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          name: profile?.name || u.user_metadata?.name || "Unknown",
          phone: profile?.phone || null,
          role: role?.role || "pos_user",
          isActive: !u.banned_until,
          createdAt: u.created_at,
        };
      });

      return new Response(JSON.stringify({ success: true, staff: staffList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE a new staff user
    if (action === "create") {
      const { email, password, name, phone, role } = payload;

      if (!email || !password || !name || !role) {
        return new Response(
          JSON.stringify({ error: "Email, password, name, and role are required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!["admin", "manager", "pos_user"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid role" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (userData.user) {
        // Create role
        await adminClient.from("user_roles").insert({
          user_id: userData.user.id,
          role,
        });

        // Update profile with phone if provided
        if (phone) {
          await adminClient
            .from("profiles")
            .update({ phone })
            .eq("user_id", userData.user.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Staff user created", userId: userData.user?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE role
    if (action === "update_role") {
      const { userId, role } = payload;
      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: "userId and role required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      await adminClient.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id" }
      );

      return new Response(
        JSON.stringify({ success: true, message: "Role updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE user
    if (action === "delete") {
      const { userId } = payload;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (userId === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete yourself" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
