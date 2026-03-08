import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Columns that reference auth.users and must be NULLed for migration
const userRefColumns = new Set(['created_by', 'removed_by', 'sold_by']);

function generateInserts(tableName: string, rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return `-- No data for ${tableName}\n`;
  
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(", ");
  
  let sql = `-- ${tableName}: ${rows.length} rows\n`;
  
  for (const row of rows) {
    const values = columns.map(c => {
      if (userRefColumns.has(c)) return "NULL";
      return escapeSQL(row[c]);
    }).join(", ");
    sql += `INSERT INTO public."${tableName}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
  }
  
  return sql + "\n";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Order matters due to foreign keys
    const tableOrder = [
      'ingredients',
      'menu_categories', 
      'menu_items',
      'menu_item_variants',
      'waiters',
      'restaurant_tables',
      'restaurant_settings',
      'orders',
      'order_items',
      'stock_purchases',
      'stock_transfers',
      'stock_removals',
      'stock_sales',
      'expenses',
    ];

    let fullSQL = `-- ============================================================\n`;
    fullSQL += `-- COMPLETE DATA IMPORT — Arabic Shinwari Restaurant POS\n`;
    fullSQL += `-- Generated: ${new Date().toISOString()}\n`;
    fullSQL += `-- Run this AFTER running combined_schema.sql\n`;
    fullSQL += `-- ============================================================\n\n`;
    
    // Delete default data first
    fullSQL += `-- Delete default data inserted by schema\n`;
    fullSQL += `DELETE FROM public.menu_categories;\n`;
    fullSQL += `DELETE FROM public.restaurant_settings;\n\n`;

    for (const table of tableOrder) {
      // Fetch all data - handle tables with more than 1000 rows
      let allData: Record<string, unknown>[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + batchSize - 1);
        
        if (error) {
          fullSQL += `-- Error fetching ${table}: ${error.message}\n\n`;
          break;
        }
        
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        
        if (data.length < batchSize) break;
        from += batchSize;
      }
      
      fullSQL += generateInserts(table, allData);
    }

    // Add note about profiles and user_roles
    fullSQL += `-- ============================================================\n`;
    fullSQL += `-- NOTE: profiles and user_roles are NOT included because they\n`;
    fullSQL += `-- are linked to auth.users which are specific to each Supabase\n`;
    fullSQL += `-- project. Create new users in your new project and assign roles.\n`;
    fullSQL += `-- ============================================================\n`;

    return new Response(fullSQL, {
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(`-- Error: ${errorMessage}`, {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
      status: 500,
    });
  }
});
