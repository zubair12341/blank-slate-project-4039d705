import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Step 1: Delete existing data
    await sb.from("menu_item_variants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("menu_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("menu_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Step 2: Get ingredient name→id map
    const { data: ings } = await sb.from("ingredients").select("id, name");
    const ingMap: Record<string, string> = {};
    for (const i of ings || []) ingMap[i.name.toUpperCase().trim()] = i.id;

    // Helper: build recipe JSONB from array of {ingredient, unit, quantity}
    const buildRecipe = (items: { n: string; u: string; q: number }[]) => {
      // Deduplicate/aggregate by ingredient name
      const agg: Record<string, { ingredientId: string; quantity: number }> = {};
      for (const item of items) {
        const id = ingMap[item.n.toUpperCase().trim()];
        if (!id) continue;
        if (agg[id]) agg[id].quantity += item.q;
        else agg[id] = { ingredientId: id, quantity: item.q };
      }
      return Object.values(agg);
    };

    // Step 3: Create categories
    const cats = [
      { name: "Fast Food Burger", icon: "🍔", color: "bg-amber-100", sort_order: 1 },
      { name: "Special Burger", icon: "🌟", color: "bg-yellow-100", sort_order: 2 },
      { name: "Broast", icon: "🍗", color: "bg-orange-100", sort_order: 3 },
      { name: "Shawarma", icon: "🌯", color: "bg-red-100", sort_order: 4 },
      { name: "Zinger Roll", icon: "🌮", color: "bg-rose-100", sort_order: 5 },
      { name: "BBQ Roll", icon: "🥙", color: "bg-pink-100", sort_order: 6 },
      { name: "Traditional Pizza", icon: "🍕", color: "bg-red-200", sort_order: 7 },
      { name: "Special Pizza", icon: "🍕", color: "bg-rose-200", sort_order: 8 },
      { name: "Extra Topping", icon: "🧀", color: "bg-yellow-200", sort_order: 9 },
      { name: "Fries", icon: "🍟", color: "bg-amber-200", sort_order: 10 },
      { name: "Appetizers", icon: "🍿", color: "bg-orange-200", sort_order: 11 },
      { name: "Sandwich", icon: "🥪", color: "bg-lime-100", sort_order: 12 },
      { name: "Chicken Karahi", icon: "🍲", color: "bg-red-300", sort_order: 13 },
      { name: "Mutton Karahi", icon: "🍖", color: "bg-rose-300", sort_order: 14 },
      { name: "Dumba Karahi", icon: "🐑", color: "bg-pink-300", sort_order: 15 },
      { name: "Beef Karahi", icon: "🥩", color: "bg-red-400", sort_order: 16 },
      { name: "Chicken Handi", icon: "🫕", color: "bg-orange-300", sort_order: 17 },
      { name: "Mutton Handi", icon: "🫕", color: "bg-amber-300", sort_order: 18 },
      { name: "BBQ Boti", icon: "🔥", color: "bg-red-100", sort_order: 19 },
      { name: "Mutton Chanp", icon: "🍖", color: "bg-rose-100", sort_order: 20 },
      { name: "Tikka", icon: "🍢", color: "bg-orange-100", sort_order: 21 },
      { name: "BBQ Kabab", icon: "🥘", color: "bg-amber-100", sort_order: 22 },
      { name: "Mandi", icon: "🍚", color: "bg-yellow-300", sort_order: 23 },
      { name: "Platter", icon: "🍽️", color: "bg-indigo-100", sort_order: 24 },
      { name: "Afghani", icon: "🏔️", color: "bg-green-100", sort_order: 25 },
      { name: "Sajji", icon: "🍗", color: "bg-lime-200", sort_order: 26 },
      { name: "Biryani", icon: "🍛", color: "bg-yellow-100", sort_order: 27 },
      { name: "Fish", icon: "🐟", color: "bg-blue-100", sort_order: 28 },
      { name: "Tandoor", icon: "🫓", color: "bg-stone-200", sort_order: 29 },
      { name: "Rice & Pulao", icon: "🍚", color: "bg-emerald-100", sort_order: 30 },
      { name: "Soup", icon: "🍜", color: "bg-teal-100", sort_order: 31 },
      { name: "Salad & Sides", icon: "🥗", color: "bg-green-200", sort_order: 32 },
      { name: "Tea & Beverages", icon: "☕", color: "bg-amber-100", sort_order: 33 },
      { name: "Cold Drinks", icon: "🥤", color: "bg-cyan-100", sort_order: 34 },
      { name: "Desserts", icon: "🍰", color: "bg-pink-100", sort_order: 35 },
      { name: "Ice Cream", icon: "🍦", color: "bg-purple-100", sort_order: 36 },
      { name: "Deals", icon: "💰", color: "bg-emerald-200", sort_order: 37 },
      { name: "Loaded Fries", icon: "🧀", color: "bg-yellow-300", sort_order: 38 },
      { name: "Pasta", icon: "🍝", color: "bg-orange-100", sort_order: 39 },
    ];

    const { data: catRows } = await sb.from("menu_categories").insert(cats).select();
    const catMap: Record<string, string> = {};
    for (const c of catRows || []) catMap[c.name] = c.id;

    // ========== RECIPE DATA ==========
    // Each recipe: name → { price, cost, ingredients: [{n, u, q}] }
    type R = { p: number; c: number; i: { n: string; u: string; q: number }[] };
    const recipes: Record<string, R> = {
      "SPECIAL CHICKEN KARAHI FULL": { p: 2300, c: 821.44, i: [{ n: "BADAM", u: "GRM", q: 10 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "PISTA", u: "GRM", q: 10 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "SPECIAL CHICKEN KARAHI HALF": { p: 1200, c: 443.70, i: [{ n: "BADAM", u: "GRM", q: 5 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "PISTA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "1 LITRE COLD DRINK": { p: 190, c: 145.50, i: [{ n: "1 LITRE COLD DRINK", u: "ML", q: 1000 }] },
      "1.5 LITRE COLD DRINK": { p: 250, c: 193.05, i: [{ n: "1.5 LITRE COLD DRINK", u: "ML", q: 1500 }] },
      "300ML COLD DRINK": { p: 100, c: 68.01, i: [{ n: "300ML COLD DRINK", u: "ML", q: 300 }] },
      "300ML STRING": { p: 120, c: 72.51, i: [{ n: "300ML STRING", u: "ML", q: 300 }] },
      "500ML COLD DRINK": { p: 120, c: 87.50, i: [{ n: "500ML COLD DRINK", u: "ML", q: 500 }] },
      "500ML STRING": { p: 140, c: 106.75, i: [{ n: "500ML STRING", u: "ML", q: 500 }] },
      "SMALL WATER": { p: 60, c: 25, i: [{ n: "SMALL WATER", u: "ML", q: 500 }] },
      "LARGE WATER": { p: 110, c: 50, i: [{ n: "LARGE WATER", u: "ML", q: 1500 }] },
      "JUMBO COLD DRINK": { p: 300, c: 200, i: [{ n: "JUMBO COLD DRINK", u: "ML", q: 2250 }] },
      "CAN MIX": { p: 120, c: 87.50, i: [{ n: "SMALL WATER", u: "ML", q: 500 }] },
      "CAN STRING": { p: 130, c: 90, i: [{ n: "SMALL WATER", u: "ML", q: 500 }] },
      "SUGAR CANE JUICE": { p: 100, c: 30, i: [] },
      // AFGHANI
      "AFGHANI PULAO FULL": { p: 650, c: 178.50, i: [{ n: "BEEF", u: "GRM", q: 100 }, { n: "CHINA SALT", u: "GRM", q: 15 }, { n: "KISMIS", u: "GRM", q: 20 }, { n: "OIL", u: "ML", q: 120 }, { n: "RICE", u: "GRM", q: 400 }, { n: "SALT", u: "GRM", q: 15 }, { n: "SB GAJAR", u: "GRM", q: 20 }, { n: "SB PAYAZ", u: "GRM", q: 10 }] },
      "AFGHANI PULAO HALF": { p: 400, c: 89.25, i: [{ n: "BEEF", u: "GRM", q: 55 }, { n: "CHINA SALT", u: "GRM", q: 10 }, { n: "KISMIS", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 60 }, { n: "RICE", u: "GRM", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB GAJAR", u: "GRM", q: 10 }, { n: "SB PAYAZ", u: "GRM", q: 10 }] },
      "SINGLE PLAN PULAO": { p: 300, c: 2.88, i: [{ n: "RICE", u: "GRM", q: 200 }] },
      // KARAHI Standard recipe template
      "CHICKEN SHINWARI KARAHI FULL": { p: 2300, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN SHINWARI KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // White karahi uses cream
      "CHICKEN WHITE KARAHI FULL": { p: 2300, c: 959.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN WHITE KARAHI HALF": { p: 1200, c: 479.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      // Red karahi
      "CHICKEN RED KARAHI FULL": { p: 2200, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN RED KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Green karahi uses cream + green herbs
      "CHICKEN GREEN KARAHI FULL": { p: 2200, c: 959.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB HARA DHANIYA", u: "GRM", q: 20 }, { n: "SB HARI MIRCH", u: "GRM", q: 10 }, { n: "SB PODINA", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN GREEN KARAHI HALF": { p: 1150, c: 479.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB HARA DHANIYA", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 5 }, { n: "SB PODINA", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      // Makhni karahi
      "CHICKEN MAKHNI KARAHI FULL": { p: 2300, c: 959.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "HALDI", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN MAKHNI KARAHI HALF": { p: 1200, c: 479.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "HALDI", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      // Standard chicken karahi template (reused for Peshawari, Charsi, Achari, Sulemani, Brown, Black Pepper, Lahori)
      // I'll use a helper function pattern - defining the base and referencing
      "CHICKEN PESHAWARI KARAHI FULL": { p: 2300, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN PESHAWARI KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN CHARSI KARAHI FULL": { p: 2300, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN CHARSI KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN ACHARI KARAHI FULL": { p: 2300, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN ACHARI KARAHI HALF": { p: 1200, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN SULEMANI KARAHI FULL": { p: 2200, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN SULEMANI KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN BROWN KARAHI FULL": { p: 2200, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN BROWN KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN BLACK PEPPER KARAHI FULL": { p: 2200, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN BLACK PEPPER KARAHI HALF": { p: 1150, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN LAHORI KARAHI FULL": { p: 2300, c: 804.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN LAHORI KARAHI HALF": { p: 1200, c: 435.30, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Chicken Qeema
      "CHICKEN QEEMA KARAHI RED": { p: 700, c: 251.40, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 300 }] },
      "CHICKEN QEEMA KARAHI WHITE": { p: 800, c: 251.40, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 300 }] },
      // Chicken Jalferezi
      "CHICKEN JALFEREZI 2 PERSON": { p: 900, c: 115.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // HANDI - Chicken (boneless based)
      "ARABIC SPE CHICKEN HANDI FULL": { p: 2600, c: 375.60, i: [{ n: "BADAM", u: "GRM", q: 5 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "PISTA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "ARABIC SPE CHICKEN HANDI HALF": { p: 1350, c: 302.11, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Standard handi template (boneless 500/1000g)
      "CHICKEN WHITE HANDI FULL": { p: 2600, c: 1125.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN BONELESS", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN WHITE HANDI HALF": { p: 1350, c: 562.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      "CHICKEN RED HANDI FULL": { p: 2499, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN RED HANDI HALF": { p: 1299, c: 302.11, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN MAKHNI HANDI FULL": { p: 2600, c: 1125.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN BONELESS", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "HALDI", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN MAKHNI HANDI HALF": { p: 1350, c: 562.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "HALDI", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      "CHICKEN BLACK PEPPER HANDI FULL": { p: 2600, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN BLACK PEPPER HANDI HALF": { p: 1350, c: 302.11, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN PESHAWARI HANDI FULL": { p: 2499, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN PESHAWARI HANDI HALF": { p: 1299, c: 1003.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN BONELESS", u: "GRM", q: 1000 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN SHINWARI HANDI FULL": { p: 2499, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN SHINWARI HANDI HALF": { p: 1299, c: 302.11, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN CHARSI HANDI FULL": { p: 2499, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN CHARSI HANDI HALF": { p: 1299, c: 302.11, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN GREEN HANDI FULL": { p: 2600, c: 959.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN BONELESS", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB HARA DHANIYA", u: "GRM", q: 20 }, { n: "SB HARI MIRCH", u: "GRM", q: 10 }, { n: "SB PODINA", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "CHICKEN GREEN HANDI HALF": { p: 1350, c: 479.69, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB HARA DHANIYA", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 5 }, { n: "SB PODINA", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      "CHICKEN PANEER HANDI FULL": { p: 2700, c: 600, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "CHEESE", u: "GRM", q: 100 }, { n: "CREAM", u: "ML", q: 200 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }] },
      "CHICKEN PANEER HANDI HALF": { p: 1400, c: 350, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 300 }, { n: "CHEESE", u: "GRM", q: 50 }, { n: "CREAM", u: "ML", q: 100 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }] },
      "CHICKEN LAHORI HANDI FULL": { p: 2600, c: 534.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN BONELESS", u: "GRM", q: 500 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "CHICKEN LAHORI HANDI HALF": { p: 1350, c: 1125.38, i: [{ n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CHICKEN BONELESS", u: "GRM", q: 1000 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      // MUTTON KARAHI (all use 1000g/500g mutton)
      "MUTTON SHINWARI KARAHI FULL": { p: 3850, c: 2265.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "MUTTON", u: "GRM", q: 1000 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "MUTTON SHINWARI KARAHI HALF": { p: 1950, c: 1165.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "MUTTON", u: "GRM", q: 500 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Burgers
      "ZINGER BURGER": { p: 400, c: 187.06, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHICKEN THAI", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAIDA", u: "GRM", q: 30 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "ZINGER CHEESE BURGER": { p: 470, c: 187.06, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHEESE SLICE", u: "PCS", q: 1 }, { n: "CHICKEN THAI", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAIDA", u: "GRM", q: 30 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "CHICKEN BURGER": { p: 380, c: 150, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHICKEN BONELESS", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAIDA", u: "GRM", q: 30 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "CHICKEN CHEESE BURGER": { p: 450, c: 178, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHEESE SLICE", u: "PCS", q: 1 }, { n: "CHICKEN BONELESS", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAIDA", u: "GRM", q: 30 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "BEEF BURGER": { p: 380, c: 170, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "BEEF", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "BEEF CHEESE BURGER": { p: 450, c: 198, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHEESE SLICE", u: "PCS", q: 1 }, { n: "BEEF", u: "GRM", q: 110 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "STEAK BURGER": { p: 500, c: 200.40, i: [{ n: "BUN L", u: "PCS", q: 1 }, { n: "CHEESE SLICE", u: "PCS", q: 1 }, { n: "CHICKEN BOTI", u: "GRM", q: 130 }, { n: "CHILLI GARLIC", u: "GRM", q: 25 }, { n: "GHEE", u: "GRM", q: 50 }, { n: "MAYO", u: "GRM", q: 10 }, { n: "MAYO BEST", u: "GRM", q: 25 }, { n: "SB BAND GOBHI", u: "GRM", q: 20 }, { n: "SB FRIES", u: "GRM", q: 50 }] },
      "PATTY BURGER": { p: 300, c: 100, i: [{ n: "BUN", u: "PCS", q: 1 }, { n: "CHICKEN BONELESS", u: "GRM", q: 80 }, { n: "MAYO", u: "GRM", q: 10 }] },
      // Rolls
      "ZINGER ROLL": { p: 240, c: 58.67, i: [{ n: "CHICKEN THAI", u: "GRM", q: 70 }, { n: "GHEE", u: "GRM", q: 50 }] },
      "ZINGER CHEESE ROLL": { p: 300, c: 60.15, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }, { n: "GHEE", u: "GRM", q: 50 }] },
      "SPECIAL ZINGER ROLL": { p: 270, c: 58.67, i: [{ n: "CHICKEN THAI", u: "GRM", q: 70 }, { n: "GHEE", u: "GRM", q: 50 }] },
      // BBQ Rolls
      "CHICKEN BOTI ROLL": { p: 240, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "MALAI BOTI ROLL": { p: 250, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "BEHARI BOTI ROLL": { p: 250, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "RESHMI ROLL": { p: 230, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "GREEN BOTI ROLL": { p: 250, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "SEEKH KABAB ROLL": { p: 250, c: 98, i: [{ n: "BEEF", u: "GRM", q: 70 }] },
      "CHICKEN BOTI MAYO ROLL": { p: 270, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "BEHARI BOTI MAYO ROLL": { p: 270, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "GREEN BOTI MAYO ROLL": { p: 270, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "SEEKH KABAB MAYO ROLL": { p: 270, c: 98, i: [{ n: "BEEF", u: "GRM", q: 70 }] },
      "RESHMI KABAB MAYO ROLL": { p: 270, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      "BEEF BOTI ROLL": { p: 270, c: 98, i: [{ n: "BEEF", u: "GRM", q: 70 }] },
      "BEEF BOTI MAYO ROLL": { p: 280, c: 98, i: [{ n: "BEEF", u: "GRM", q: 70 }] },
      "BEEF AFGHANI ROLL": { p: 280, c: 98, i: [{ n: "BEEF", u: "GRM", q: 70 }] },
      "CHICKEN MALAI BOTI MAYO ROLL": { p: 280, c: 58.66, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 70 }] },
      // BBQ Boti (Half/Full)
      "NAMKEEN BOTI FULL": { p: 800, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "NAMKEEN BOTI HALF": { p: 450, c: 163.40, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      "MALAI BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "MALAI BOTI HALF": { p: 450, c: 163.40, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      "SHANGREELA BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "SHANGREELA BOTI HALF": { p: 450, c: 167.60, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 200 }] },
      "CHICKEN ACHARI BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "CHICKEN ACHARI BOTI HALF": { p: 450, c: 163.40, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      "BEEF BEHARI BOTI FULL": { p: 850, c: 280, i: [{ n: "BEEF", u: "GRM", q: 200 }] },
      "BEEF BEHARI BOTI HALF": { p: 450, c: 140, i: [{ n: "BEEF", u: "GRM", q: 100 }] },
      "CHICKEN BEHARI BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "CHICKEN BEHARI BOTI HALF": { p: 450, c: 163.40, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      "GREEN BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "GREEN BOTI HALF": { p: 450, c: 163.40, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      "TANDOORI BOTI FULL": { p: 850, c: 326.80, i: [{ n: "CHICKEN BOTI", u: "GRM", q: 400 }] },
      "TANDOORI BOTI HALF": { p: 450, c: 163.40, i: [{ n: "BBQ MASALA", u: "GRM", q: 10 }, { n: "CHICKEN BOTI", u: "GRM", q: 200 }] },
      // Tikka
      "CHICKEN TIKKA LEG": { p: 400, c: 216, i: [{ n: "CHICKEN TIKKA LEG", u: "GRM", q: 400 }] },
      "CHICKEN TIKKA CHEST": { p: 450, c: 250, i: [{ n: "CHICKEN TIKKA CHEST", u: "GRM", q: 400 }] },
      "BALOCHI TIKKA LEG": { p: 400, c: 216, i: [{ n: "CHICKEN TIKKA LEG", u: "GRM", q: 400 }] },
      "MALAI TIKKA": { p: 470, c: 250, i: [{ n: "CHICKEN TIKKA CHEST", u: "GRM", q: 400 }] },
      "GREEN TIKKA": { p: 470, c: 250, i: [{ n: "CHICKEN TIKKA CHEST", u: "GRM", q: 400 }] },
      // Kabab
      "BEEF GOLA KABAB FULL": { p: 800, c: 280, i: [{ n: "BEEF", u: "GRM", q: 200 }] },
      "BEEF GOLA KABAB HALF": { p: 450, c: 140, i: [{ n: "BEEF", u: "GRM", q: 100 }] },
      "CHICKEN GOLA KABAB FULL": { p: 800, c: 167.60, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 200 }] },
      "CHICKEN GOLA KABAB HALF": { p: 450, c: 83.80, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 100 }] },
      "CHICKEN RESHMI KABAB FULL": { p: 800, c: 167.60, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 200 }] },
      "CHICKEN RESHMI KABAB HALF": { p: 450, c: 83.80, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 100 }] },
      "BEEF SEEKH KABAB": { p: 50, c: 28, i: [{ n: "BEEF", u: "GRM", q: 20 }] },
      "BEEF SEEKH KABAB FULL": { p: 800, c: 280, i: [{ n: "BEEF", u: "GRM", q: 200 }] },
      "BEEF SEEKH KABAB HALF": { p: 450, c: 280, i: [{ n: "BEEF", u: "GRM", q: 200 }] },
      // Mutton Chanp  
      "MUTTON NAMKEEN CHANP FULL": { p: 3600, c: 2100, i: [{ n: "MUTTON", u: "GRM", q: 1000 }] },
      "MUTTON NAMKEEN CHANP HALF": { p: 1800, c: 1050, i: [{ n: "MUTTON", u: "GRM", q: 500 }] },
      "MUTTON NAMKEEN BOTI FULL": { p: 4200, c: 2100, i: [{ n: "MUTTON", u: "GRM", q: 1000 }] },
      "MUTTON NAMKEEN BOTI HALF": { p: 2100, c: 2100, i: [{ n: "MUTTON", u: "GRM", q: 1000 }] },
      // Shawarma
      "CHICKEN SHAWARMA": { p: 180, c: 60.85, i: [{ n: "BREAD PETA", u: "PCS", q: 1 }, { n: "CHICKEN THAI", u: "GRM", q: 50 }] },
      "GRILL SHAWARMA": { p: 250, c: 80, i: [{ n: "BREAD PETA", u: "PCS", q: 1 }, { n: "CHICKEN BOTI", u: "GRM", q: 70 }] },
      "ZINGER SHAWARMA": { p: 300, c: 60.85, i: [{ n: "BREAD PETA", u: "PCS", q: 1 }, { n: "CHICKEN THAI", u: "GRM", q: 50 }] },
      // Broast
      "CHICKEN BROAST CHEST": { p: 550, c: 300, i: [{ n: "CHICKEN BROAST", u: "GRM", q: 500 }, { n: "OIL", u: "ML", q: 200 }] },
      "MASALA BROAST CHEST": { p: 580, c: 320, i: [{ n: "CHICKEN BROAST", u: "GRM", q: 500 }, { n: "OIL", u: "ML", q: 200 }] },
      "SUSSI BROAST": { p: 600, c: 587.57, i: [{ n: "BUN L", u: "PCS", q: 10 }, { n: "CHICKEN BONELESS", u: "GRM", q: 310 }, { n: "OIL", u: "ML", q: 100 }] },
      // Pizza
      "SMALL PIZZA": { p: 400, c: 146.92, i: [{ n: "CHEESE", u: "GRM", q: 60 }, { n: "CHICKEN BOTI", u: "GRM", q: 60 }, { n: "MAIDA", u: "GRM", q: 130 }, { n: "MAYO BEST", u: "GRM", q: 20 }] },
      "MEDIUM PIZZA": { p: 700, c: 250, i: [{ n: "CHEESE", u: "GRM", q: 120 }, { n: "CHICKEN BOTI", u: "GRM", q: 120 }, { n: "MAIDA", u: "GRM", q: 200 }, { n: "MAYO BEST", u: "GRM", q: 30 }] },
      "LARGE PIZZA": { p: 1050, c: 400, i: [{ n: "CHEESE", u: "GRM", q: 200 }, { n: "CHICKEN BOTI", u: "GRM", q: 200 }, { n: "MAIDA", u: "GRM", q: 300 }, { n: "MAYO BEST", u: "GRM", q: 50 }] },
      "SMALL SPECIAL PIZZA": { p: 500, c: 180, i: [{ n: "CHEESE", u: "GRM", q: 80 }, { n: "CHICKEN BOTI", u: "GRM", q: 80 }, { n: "MAIDA", u: "GRM", q: 130 }, { n: "MAYO BEST", u: "GRM", q: 20 }] },
      "MEDIUM SPECIAL PIZZA": { p: 850, c: 300, i: [{ n: "CHEESE", u: "GRM", q: 150 }, { n: "CHICKEN BOTI", u: "GRM", q: 150 }, { n: "MAIDA", u: "GRM", q: 200 }, { n: "MAYO BEST", u: "GRM", q: 30 }] },
      "LARGE SPECIAL PIZZA": { p: 1250, c: 450, i: [{ n: "CHEESE", u: "GRM", q: 250 }, { n: "CHICKEN BOTI", u: "GRM", q: 250 }, { n: "MAIDA", u: "GRM", q: 300 }, { n: "MAYO BEST", u: "GRM", q: 50 }] },
      // Fries
      "FRIES": { p: 150, c: 19.50, i: [{ n: "SB FRIES", u: "GRM", q: 150 }] },
      "MASALA FRIES": { p: 180, c: 25, i: [{ n: "SB FRIES", u: "GRM", q: 150 }, { n: "CHAT MASLA", u: "GRM", q: 5 }] },
      "MAYO GARLIC FRIES": { p: 220, c: 35, i: [{ n: "SB FRIES", u: "GRM", q: 150 }, { n: "MAYO", u: "GRM", q: 20 }] },
      // Nuggets
      "NUGGETS 5PCS": { p: 350, c: 83.80, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 100 }] },
      "NUGGETS 10PCS": { p: 650, c: 83.80, i: [{ n: "CHICKEN BONELESS", u: "GRM", q: 100 }] },
      // Tandoor
      "NAAN": { p: 40, c: 15, i: [{ n: "MAIDA", u: "GRM", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "YEAST", u: "GRM", q: 5 }] },
      "NAN TIL WALA": { p: 50, c: 19.19, i: [{ n: "DRY MILK", u: "GRM", q: 2.5 }, { n: "GHEE", u: "GRM", q: 2.5 }, { n: "MAIDA", u: "GRM", q: 140 }, { n: "SALT", u: "GRM", q: 5 }, { n: "TILL", u: "GRM", q: 2.5 }] },
      "QANDHARI NAAN": { p: 80, c: 24.26, i: [{ n: "GHEE", u: "GRM", q: 5 }, { n: "MAIDA", u: "GRM", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "TILL", u: "GRM", q: 5 }, { n: "YEAST", u: "GRM", q: 5 }] },
      "GARLIC NAAN": { p: 70, c: 26.26, i: [{ n: "DRY MILK", u: "GRM", q: 5 }, { n: "GHEE", u: "GRM", q: 5 }, { n: "MAIDA", u: "GRM", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "YEAST", u: "GRM", q: 5 }] },
      "CHAPATI": { p: 30, c: 5.04, i: [{ n: "CHAKI ATA", u: "GRM", q: 45 }, { n: "SALT", u: "GRM", q: 4 }] },
      "PARATHA": { p: 60, c: 13.56, i: [{ n: "FINE ATA", u: "GRM", q: 120 }] },
      // Soup
      "SOUP": { p: 150, c: 63.90, i: [{ n: "CHICKEN KARAHI", u: "GRM", q: 100 }] },
      "SPECIAL SOUP": { p: 200, c: 63.90, i: [{ n: "CHICKEN KARAHI", u: "GRM", q: 100 }] },
      // Salad
      "FRESH SALAD": { p: 140, c: 23.70, i: [{ n: "SB GAJAR", u: "GRM", q: 100 }, { n: "SB KHERA", u: "GRM", q: 100 }, { n: "SB LEMON", u: "GRM", q: 5 }, { n: "SB PAYAZ", u: "GRM", q: 100 }] },
      "RAITA ZEERA": { p: 140, c: 50.40, i: [{ n: "DAHI", u: "GRM", q: 180 }] },
      // Tea
      "FULL CHAI": { p: 120, c: 51.40, i: [{ n: "MILK", u: "ML", q: 150 }, { n: "PATI", u: "GRM", q: 10 }, { n: "SUGAR", u: "GRM", q: 10 }] },
      "GREEN TEA": { p: 60, c: 44, i: [{ n: "GREEN TEA", u: "GRM", q: 20 }] },
      "SULEMANI KEHWA": { p: 60, c: 22, i: [{ n: "GREEN TEA", u: "GRM", q: 10 }] },
      "GREEN TEA THERMOS": { p: 250, c: 100, i: [{ n: "GREEN TEA", u: "GRM", q: 50 }] },
      "MALAI KHOPRA CHAI": { p: 120, c: 60, i: [{ n: "MILK", u: "ML", q: 150 }, { n: "PATI", u: "GRM", q: 10 }, { n: "COCUNT POWDER", u: "GRM", q: 5 }] },
      // Mandi
      "1 PERSON MANDI": { p: 1499, c: 739.27, i: [{ n: "MUTTON", u: "GRM", q: 350 }, { n: "OIL", u: "ML", q: 50 }, { n: "RICE", u: "GRM", q: 200 }] },
      "2 PERSON MANDI": { p: 2999, c: 1478.55, i: [{ n: "MUTTON", u: "GRM", q: 700 }, { n: "OIL", u: "ML", q: 100 }, { n: "RICE", u: "GRM", q: 400 }] },
      "3 PERSON MANDI": { p: 3999, c: 2108.55, i: [{ n: "MUTTON LEG", u: "GRM", q: 1000 }, { n: "OIL", u: "ML", q: 100 }, { n: "RICE", u: "GRM", q: 400 }] },
      "4 PERSON MANDI": { p: 4999, c: 2937.82, i: [{ n: "EGGS", u: "PCS", q: 3 }, { n: "MUTTON LEG", u: "GRM", q: 1350 }, { n: "OIL", u: "ML", q: 150 }, { n: "RICE", u: "GRM", q: 600 }] },
      "SINGLE ARABIC CHICKEN MANDI": { p: 999, c: 328, i: [{ n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "OIL", u: "ML", q: 150 }, { n: "RICE", u: "GRM", q: 300 }] },
      "FULL ARABIC CHICKEN MANDI": { p: 1950, c: 656, i: [{ n: "CHICKEN KARAHI", u: "GRM", q: 1000 }, { n: "OIL", u: "ML", q: 200 }, { n: "RICE", u: "GRM", q: 500 }] },
      // Sajji
      "FULL SAJJI": { p: 1400, c: 666.01, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "CHICKEN SAJJI", u: "GRM", q: 1200 }, { n: "OIL", u: "ML", q: 100 }, { n: "SALT", u: "GRM", q: 10 }] },
      "HALF SAJJI": { p: 700, c: 333, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CHICKEN SAJJI", u: "GRM", q: 600 }, { n: "OIL", u: "ML", q: 50 }, { n: "SALT", u: "GRM", q: 5 }] },
      // Biryani
      "CHICKEN MATKA BIRYANI SINGLE": { p: 1000, c: 277.07, i: [{ n: "BROWN ONION", u: "GRM", q: 20 }, { n: "CHICKEN KARAHI", u: "GRM", q: 250 }, { n: "HALDI", u: "GRM", q: 20 }, { n: "HANDI SMALL", u: "PCS", q: 1 }, { n: "RICE", u: "GRM", q: 300 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "CHICKEN MATKA BIRYANI DOUBLE": { p: 2000, c: 340.72, i: [{ n: "BIRYANI MASLA", u: "GRM", q: 50 }, { n: "CHICKEN KARAHI", u: "GRM", q: 500 }, { n: "HALDI", u: "GRM", q: 20 }, { n: "OIL", u: "ML", q: 100 }, { n: "RICE", u: "GRM", q: 300 }, { n: "SALT", u: "GRM", q: 5 }] },
      "BEEF MATKA BIRYANI SINGLE": { p: 1500, c: 369.78, i: [{ n: "BEEF", u: "GRM", q: 250 }, { n: "BIRYANI MASLA", u: "GRM", q: 50 }, { n: "HALDI", u: "GRM", q: 20 }, { n: "OIL", u: "ML", q: 100 }, { n: "RICE", u: "GRM", q: 200 }, { n: "SALT", u: "GRM", q: 5 }] },
      "BEEF MATKA BIRYANI DOUBLE": { p: 3000, c: 721.22, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BIRYANI MASLA", u: "GRM", q: 50 }, { n: "HALDI", u: "GRM", q: 20 }, { n: "OIL", u: "ML", q: 100 }, { n: "RICE", u: "GRM", q: 300 }, { n: "SALT", u: "GRM", q: 5 }] },
      // Fish
      "GREEN GRILL FISH": { p: 1799, c: 800, i: [{ n: "FISH", u: "GRM", q: 1000 }] },
      "RED GRILL FISH": { p: 1699, c: 800, i: [{ n: "FISH", u: "GRM", q: 1000 }] },
      // Desserts
      "CHEESE KUNAFA": { p: 650, c: 200, i: [{ n: "CHEESE", u: "GRM", q: 100 }, { n: "MAIDA", u: "GRM", q: 100 }, { n: "SUGAR", u: "GRM", q: 50 }] },
      "CHOCOLATE KUNAFA": { p: 750, c: 250, i: [{ n: "CHEESE", u: "GRM", q: 100 }, { n: "MAIDA", u: "GRM", q: 100 }, { n: "SUGAR", u: "GRM", q: 50 }] },
      "MATKA KHEER": { p: 250, c: 80, i: [{ n: "MILK", u: "ML", q: 200 }, { n: "RICE", u: "GRM", q: 30 }, { n: "SUGAR", u: "GRM", q: 30 }] },
      // Beef Karahi
      "BEEF RED KARAHI FULL": { p: 2650, c: 1565.64, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "BEEF RED KARAHI HALF": { p: 1350, c: 815.80, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "BEEF WHITE KARAHI FULL": { p: 2799, c: 1687.38, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "BEEF WHITE KARAHI HALF": { p: 1400, c: 844.69, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      "BEEF PESHAWARI KARAHI FULL": { p: 2700, c: 1565.64, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "BEEF PESHAWARI KARAHI HALF": { p: 1350, c: 815.80, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "BEEF CHARSI KARAHI FULL": { p: 2700, c: 1565.64, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "BEEF CHARSI KARAHI HALF": { p: 1350, c: 815.80, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "BEEF GREEN KARAHI FULL": { p: 2700, c: 1565.64, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "BEEF GREEN KARAHI HALF": { p: 1350, c: 815.80, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      "BEEF KEEMA WHITE FULL": { p: 2750, c: 1687.38, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 15 }, { n: "CREAM", u: "ML", q: 200 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "OIL", u: "ML", q: 200 }, { n: "SALT", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }] },
      "BEEF KEEMA WHITE HALF": { p: 1400, c: 844.69, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "CREAM", u: "ML", q: 100 }, { n: "DAHI", u: "GRM", q: 70 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "WHITE PAPER", u: "GRM", q: 5 }] },
      "BEEF KEEMA BROWN FULL": { p: 2599, c: 1565.64, i: [{ n: "BEEF", u: "GRM", q: 1000 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "BEEF KEEMA BROWN HALF": { p: 1350, c: 815.80, i: [{ n: "BEEF", u: "GRM", q: 500 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Bakra
      "SALIM BAKRA 1KG": { p: 3299, c: 2100, i: [{ n: "MUTTON", u: "GRM", q: 1000 }] },
      "SALIM BAKRA WITH RICE": { p: 3599, c: 2200, i: [{ n: "MUTTON", u: "GRM", q: 1000 }, { n: "RICE", u: "GRM", q: 400 }] },
      // Ice cream
      "ICE CREAM SMALL": { p: 100, c: 40, i: [{ n: "ICE CREAM", u: "GRM", q: 100 }] },
      "ICE CREAM LARGE": { p: 200, c: 80, i: [{ n: "ICE CREAM", u: "GRM", q: 200 }] },
      // Sandwich
      "CLUB SANDWICH SMALL": { p: 100, c: 40, i: [{ n: "BREAD", u: "PCS", q: 2 }, { n: "CHICKEN BONELESS", u: "GRM", q: 30 }] },
      "CLUB SANDWICH LARGE": { p: 400, c: 120, i: [{ n: "BREAD", u: "PCS", q: 4 }, { n: "CHICKEN BONELESS", u: "GRM", q: 80 }] },
      // Beef Afghani Boti
      "BEEF AFGHANI BOTI HALF": { p: 550, c: 280, i: [{ n: "BEEF", u: "GRM", q: 200 }] },
      "BEEF AFGHANI BOTI FULL": { p: 1000, c: 560, i: [{ n: "BEEF", u: "GRM", q: 400 }] },
      // Dumba Karahi (all same pattern with DUMBA instead of MUTTON)
      "DUMBA SHINWARI KARAHI FULL": { p: 3850, c: 2365.64, i: [{ n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 150 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "DUMBA", u: "GRM", q: 1000 }, { n: "GARM MASLA", u: "GRM", q: 10 }, { n: "HALDI", u: "GRM", q: 6 }, { n: "KARAHI MASLA", u: "GRM", q: 10 }, { n: "OIL", u: "ML", q: 230 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 10 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "DUMBA SHINWARI KARAHI HALF": { p: 1950, c: 1215.80, i: [{ n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "DUMBA", u: "GRM", q: 500 }, { n: "GARM MASLA", u: "GRM", q: 5 }, { n: "HALDI", u: "GRM", q: 3 }, { n: "KARAHI MASLA", u: "GRM", q: 5 }, { n: "OIL", u: "ML", q: 150 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
      // Special Mutton Karahi (with ghee desi, badam, pista)
      "SPECIAL MUTTON KARAHI FULL": { p: 3900, c: 2507.94, i: [{ n: "BADAM", u: "GRM", q: 10 }, { n: "BLACK PAPER", u: "GRM", q: 10 }, { n: "DAHI", u: "GRM", q: 100 }, { n: "DHANIYA", u: "GRM", q: 10 }, { n: "GHEE DESI", u: "GRM", q: 75 }, { n: "MUTTON", u: "GRM", q: 1000 }, { n: "OIL", u: "ML", q: 230 }, { n: "PISTA", u: "GRM", q: 10 }, { n: "SALT", u: "GRM", q: 10 }, { n: "SB ADRAK", u: "GRM", q: 10 }, { n: "SB HARI MIRCH", u: "GRM", q: 25 }, { n: "SB LAHSAN", u: "GRM", q: 10 }, { n: "SB TAMTOR", u: "GRM", q: 600 }, { n: "WHITE PAPER", u: "GRM", q: 10 }, { n: "ZEERA", u: "GRM", q: 10 }] },
      "SPECIAL MUTTON KARAHI HALF": { p: 2000, c: 1300.20, i: [{ n: "BADAM", u: "GRM", q: 5 }, { n: "BLACK PAPER", u: "GRM", q: 5 }, { n: "DAHI", u: "GRM", q: 50 }, { n: "DHANIYA", u: "GRM", q: 5 }, { n: "GHEE DESI", u: "GRM", q: 50 }, { n: "MUTTON", u: "GRM", q: 500 }, { n: "OIL", u: "ML", q: 150 }, { n: "PISTA", u: "GRM", q: 5 }, { n: "SALT", u: "GRM", q: 5 }, { n: "SB ADRAK", u: "GRM", q: 5 }, { n: "SB HARI MIRCH", u: "GRM", q: 15 }, { n: "SB LAHSAN", u: "GRM", q: 5 }, { n: "SB TAMTOR", u: "GRM", q: 500 }, { n: "WHITE PAPER", u: "GRM", q: 5 }, { n: "ZEERA", u: "GRM", q: 5 }] },
    };

    // Helper to get recipe or empty
    const getRecipe = (name: string) => {
      const r = recipes[name];
      if (!r) return { recipe: [], recipeCost: 0, profitMargin: 0 };
      const recipe = buildRecipe(r.i);
      const cost = r.c;
      const margin = r.p > 0 ? ((r.p - cost) / r.p) * 100 : 0;
      return { recipe, recipeCost: cost, profitMargin: Math.round(margin * 100) / 100 };
    };

    // ========== MENU ITEMS ==========
    // Format: { name, cat, price, desc?, variants?: [{name, price, recipeKey}] }
    type ItemDef = { name: string; cat: string; price: number; desc?: string; recipeKey?: string; variants?: { name: string; price: number; recipeKey: string; sort: number }[] };

    const items: ItemDef[] = [
      // === FAST FOOD BURGERS ===
      { name: "Zinger Burger", cat: "Fast Food Burger", price: 400, recipeKey: "ZINGER BURGER" },
      { name: "Zinger Cheese Burger", cat: "Fast Food Burger", price: 470, recipeKey: "ZINGER CHEESE BURGER" },
      { name: "Chicken Burger", cat: "Fast Food Burger", price: 380, recipeKey: "CHICKEN BURGER" },
      { name: "Chicken Cheese Burger", cat: "Fast Food Burger", price: 450, recipeKey: "CHICKEN CHEESE BURGER" },
      { name: "Beef Burger", cat: "Fast Food Burger", price: 380, recipeKey: "BEEF BURGER" },
      { name: "Beef Cheese Burger", cat: "Fast Food Burger", price: 450, recipeKey: "BEEF CHEESE BURGER" },
      { name: "Steak Burger", cat: "Fast Food Burger", price: 500, recipeKey: "STEAK BURGER" },
      { name: "Patty Burger", cat: "Fast Food Burger", price: 300, recipeKey: "PATTY BURGER" },
      // === SPECIAL BURGERS ===
      { name: "Zinger Pizza Burger", cat: "Special Burger", price: 600 },
      { name: "Jalapeno Zinger Burger", cat: "Special Burger", price: 500 },
      { name: "Stiko Sandwich", cat: "Special Burger", price: 600 },
      // === BROAST ===
      { name: "Chicken Broast (Chest)", cat: "Broast", price: 550, recipeKey: "CHICKEN BROAST CHEST" },
      { name: "Masala Broast (Chest)", cat: "Broast", price: 580, recipeKey: "MASALA BROAST CHEST" },
      { name: "Sussi Broast", cat: "Broast", price: 600, recipeKey: "SUSSI BROAST" },
      // === SHAWARMA ===
      { name: "Chicken Shawarma", cat: "Shawarma", price: 180, recipeKey: "CHICKEN SHAWARMA" },
      { name: "Grill Shawarma", cat: "Shawarma", price: 250, recipeKey: "GRILL SHAWARMA" },
      { name: "Zinger Shawarma", cat: "Shawarma", price: 300, recipeKey: "ZINGER SHAWARMA" },
      // === ZINGER ROLLS ===
      { name: "Zinger Roll", cat: "Zinger Roll", price: 240, recipeKey: "ZINGER ROLL" },
      { name: "Zinger Cheese Roll", cat: "Zinger Roll", price: 300, recipeKey: "ZINGER CHEESE ROLL" },
      { name: "Special Zinger Roll", cat: "Zinger Roll", price: 270, recipeKey: "SPECIAL ZINGER ROLL" },
      // === BBQ ROLLS ===
      { name: "Chicken Boti Roll", cat: "BBQ Roll", price: 240, recipeKey: "CHICKEN BOTI ROLL" },
      { name: "Malai Boti Roll", cat: "BBQ Roll", price: 250, recipeKey: "MALAI BOTI ROLL" },
      { name: "Behari Boti Roll", cat: "BBQ Roll", price: 200, recipeKey: "BEHARI BOTI ROLL" },
      { name: "Reshmi Roll", cat: "BBQ Roll", price: 230, recipeKey: "RESHMI ROLL" },
      { name: "Green Boti Roll", cat: "BBQ Roll", price: 250, recipeKey: "GREEN BOTI ROLL" },
      { name: "Seekh Kabab Roll", cat: "BBQ Roll", price: 250, recipeKey: "SEEKH KABAB ROLL" },
      { name: "Chicken Boti Mayo Roll", cat: "BBQ Roll", price: 270, recipeKey: "CHICKEN BOTI MAYO ROLL" },
      { name: "Behari Boti Mayo Roll", cat: "BBQ Roll", price: 270, recipeKey: "BEHARI BOTI MAYO ROLL" },
      { name: "Green Boti Mayo Roll", cat: "BBQ Roll", price: 270, recipeKey: "GREEN BOTI MAYO ROLL" },
      { name: "Seekh Kabab Mayo Roll", cat: "BBQ Roll", price: 270, recipeKey: "SEEKH KABAB MAYO ROLL" },
      { name: "Reshmi Kabab Mayo Roll", cat: "BBQ Roll", price: 270, recipeKey: "RESHMI KABAB MAYO ROLL" },
      { name: "Beef Boti Roll", cat: "BBQ Roll", price: 270, recipeKey: "BEEF BOTI ROLL" },
      { name: "Beef Boti Mayo Roll", cat: "BBQ Roll", price: 280, recipeKey: "BEEF BOTI MAYO ROLL" },
      { name: "Beef Afghani Roll", cat: "BBQ Roll", price: 280, recipeKey: "BEEF AFGHANI ROLL" },
      { name: "Chicken Malai Boti Mayo Roll", cat: "BBQ Roll", price: 280, recipeKey: "CHICKEN MALAI BOTI MAYO ROLL" },
      // === TRADITIONAL PIZZA (with S/M/L variants) ===
      { name: "Arabic Traditional Pizza", cat: "Traditional Pizza", price: 400, variants: [
        { name: "Small", price: 400, recipeKey: "SMALL PIZZA", sort: 1 },
        { name: "Medium", price: 700, recipeKey: "MEDIUM PIZZA", sort: 2 },
        { name: "Large", price: 1050, recipeKey: "LARGE PIZZA", sort: 3 },
      ]},
      { name: "Double Deal Traditional Pizza", cat: "Traditional Pizza", price: 750, variants: [
        { name: "Small", price: 750, recipeKey: "SMALL PIZZA", sort: 1 },
        { name: "Medium", price: 1200, recipeKey: "MEDIUM PIZZA", sort: 2 },
        { name: "Large", price: 1700, recipeKey: "LARGE PIZZA", sort: 3 },
      ]},
      // === SPECIAL PIZZA ===
      { name: "Arabic Special Pizza", cat: "Special Pizza", price: 500, variants: [
        { name: "Small", price: 500, recipeKey: "SMALL SPECIAL PIZZA", sort: 1 },
        { name: "Medium", price: 850, recipeKey: "MEDIUM SPECIAL PIZZA", sort: 2 },
        { name: "Large", price: 1250, recipeKey: "LARGE SPECIAL PIZZA", sort: 3 },
      ]},
      { name: "Double Deal Special Pizza", cat: "Special Pizza", price: 950, variants: [
        { name: "Small", price: 950, recipeKey: "SMALL SPECIAL PIZZA", sort: 1 },
        { name: "Medium", price: 1650, recipeKey: "MEDIUM SPECIAL PIZZA", sort: 2 },
        { name: "Large", price: 2400, recipeKey: "LARGE SPECIAL PIZZA", sort: 3 },
      ]},
      // === EXTRA TOPPING ===
      { name: "Chicken Cheese Topping", cat: "Extra Topping", price: 60, variants: [
        { name: "Small", price: 60, recipeKey: "", sort: 1 },
        { name: "Medium", price: 120, recipeKey: "", sort: 2 },
        { name: "Large", price: 180, recipeKey: "", sort: 3 },
      ]},
      // === FRIES ===
      { name: "Fries", cat: "Fries", price: 150, recipeKey: "FRIES" },
      { name: "Masala Fries", cat: "Fries", price: 180, recipeKey: "MASALA FRIES" },
      { name: "Mayo Garlic Fries", cat: "Fries", price: 220, recipeKey: "MAYO GARLIC FRIES" },
      // === LOADED FRIES ===
      { name: "Cheese Fries", cat: "Loaded Fries", price: 300, variants: [
        { name: "Single", price: 300, recipeKey: "", sort: 1 },
        { name: "Double", price: 380, recipeKey: "", sort: 2 },
      ]},
      { name: "Pizza Fries", cat: "Loaded Fries", price: 350, variants: [
        { name: "Single", price: 350, recipeKey: "", sort: 1 },
        { name: "Double", price: 500, recipeKey: "", sort: 2 },
      ]},
      // === APPETIZERS ===
      { name: "Nuggets", cat: "Appetizers", price: 350, variants: [
        { name: "5 Pcs", price: 350, recipeKey: "NUGGETS 5PCS", sort: 1 },
        { name: "10 Pcs", price: 650, recipeKey: "NUGGETS 10PCS", sort: 2 },
      ]},
      // === SANDWICH ===
      { name: "Club Sandwich", cat: "Sandwich", price: 400, variants: [
        { name: "Small", price: 100, recipeKey: "CLUB SANDWICH SMALL", sort: 1 },
        { name: "Large", price: 400, recipeKey: "CLUB SANDWICH LARGE", sort: 2 },
      ]},
      { name: "Malai Sandwich", cat: "Sandwich", price: 450 },
      { name: "Bar B.Q. Sandwich", cat: "Sandwich", price: 450 },
      { name: "Chicken Sandwich", cat: "Sandwich", price: 300 },
      // === PASTA ===
      { name: "Pasta", cat: "Pasta", price: 550 },
      // === CHICKEN KARAHI ===
      ...["Arabic Spe. Zaitoon Karahi", "Chicken Shinwari Karahi", "Chicken White Karahi", "Chicken Red Karahi", "Chk. Peshawari Karahi", "Chicken Charsi Karahi", "Chicken Black Pepper Karahi", "Chicken Sulemani Karahi", "Chicken Brown Karahi", "Chicken Green Karahi", "Chicken Makhni Karahi", "Chicken Achari Karahi", "Chicken Lahori Karahi"].map(name => {
        const base = name.replace("Arabic Spe. Zaitoon Karahi", "SPECIAL CHICKEN KARAHI")
          .replace("Chk. Peshawari Karahi", "CHICKEN PESHAWARI KARAHI")
          .replace(/ /g, " ").toUpperCase();
        const fullKey = base + " FULL";
        const halfKey = base + " HALF";
        const rFull = recipes[fullKey];
        const rHalf = recipes[halfKey];
        return {
          name, cat: "Chicken Karahi", price: rHalf?.p || 1150,
          variants: [
            { name: "Half", price: rHalf?.p || 1150, recipeKey: halfKey, sort: 1 },
            { name: "Full", price: rFull?.p || 2300, recipeKey: fullKey, sort: 2 },
          ]
        } as ItemDef;
      }),
      // Chicken Qeema (no variants, separate items)
      { name: "Chi. Qeema Karahi White", cat: "Chicken Karahi", price: 800, recipeKey: "CHICKEN QEEMA KARAHI WHITE" },
      { name: "Chi. Qeema Karahi Red", cat: "Chicken Karahi", price: 700, recipeKey: "CHICKEN QEEMA KARAHI RED" },
      { name: "Chicken Jalferezi", cat: "Chicken Karahi", price: 900, recipeKey: "CHICKEN JALFEREZI 2 PERSON" },
      // === CHICKEN HANDI ===
      ...["Arabic Spe. Zaitoon Handi", "Chicken White Handi", "Chicken Red Handi", "Chicken Makhni Handi", "Chicken Black Pepper Handi", "Chicken Peshawari Handi", "Chicken Shinwari Handi", "Chicken Charsi Handi", "Chicken Green Handi", "Chicken Paneer Handi", "Chicken Lahori Handi"].map(name => {
        const base = name.replace("Arabic Spe. Zaitoon Handi", "ARABIC SPE CHICKEN HANDI").toUpperCase();
        const fullKey = base + " FULL";
        const halfKey = base + " HALF";
        const rFull = recipes[fullKey];
        const rHalf = recipes[halfKey];
        return {
          name, cat: "Chicken Handi", price: rHalf?.p || 1350,
          variants: [
            { name: "Half", price: rHalf?.p || 1350, recipeKey: halfKey, sort: 1 },
            { name: "Full", price: rFull?.p || 2600, recipeKey: fullKey, sort: 2 },
          ]
        } as ItemDef;
      }),
      // === MUTTON KARAHI ===
      ...["Arabic Spe. Zaitoon Karahi", "Mutton Shinwari Karahi", "Mutton Khara Ghowasha", "Mutton White Karahi", "Mutton Red Karahi", "Mutton Peshawari Karahi", "Mutton Charsi Karahi", "Mutton Black Pepper Karahi", "Mutton Sulemani Karahi", "Mutton Brown Karahi", "Mutton Green Karahi", "Mutton Makhni Karahi", "Mutton Achari Karahi", "Mutton Qeema"].map(name => {
        const base = name === "Arabic Spe. Zaitoon Karahi" ? "SPECIAL MUTTON KARAHI" : name.toUpperCase();
        const fullKey = base + " FULL";
        const halfKey = base + " HALF";
        const rFull = recipes[fullKey] || recipes["MUTTON SHINWARI KARAHI FULL"];
        const rHalf = recipes[halfKey] || recipes["MUTTON SHINWARI KARAHI HALF"];
        return {
          name: name === "Arabic Spe. Zaitoon Karahi" ? "Mutton Arabic Spe. Zaitoon Karahi" : name, 
          cat: "Mutton Karahi", price: rHalf?.p || 1950,
          variants: [
            { name: "Half", price: rHalf?.p || 1950, recipeKey: halfKey in recipes ? halfKey : "MUTTON SHINWARI KARAHI HALF", sort: 1 },
            { name: "Full", price: rFull?.p || 3850, recipeKey: fullKey in recipes ? fullKey : "MUTTON SHINWARI KARAHI FULL", sort: 2 },
          ]
        } as ItemDef;
      }),
      // === MUTTON HANDI ===
      ...["Arabic Spe. Zaitoon Handi", "Mutton White Handi", "Mutton Red Handi", "Mutton Makhni Handi", "Mutton Black Pepper Handi", "Mutton Peshawari Handi", "Mutton Shinwari Handi", "Mutton Charsi Handi", "Mutton Green Handi", "Mutton Lahori Handi", "Mutton Paneer Handi"].map(name => {
        const base = name === "Arabic Spe. Zaitoon Handi" ? "ARABIC SPE MUTTON HANDI" : name.toUpperCase();
        const priceMap: Record<string,number[]> = {
          "Arabic Spe. Zaitoon Handi": [2150, 4200],
          "Mutton White Handi": [2150, 4200],
          "Mutton Red Handi": [2050, 4000],
          "Mutton Makhni Handi": [2100, 4100],
          "Mutton Black Pepper Handi": [2100, 4100],
          "Mutton Peshawari Handi": [2050, 4000],
          "Mutton Shinwari Handi": [2050, 4000],
          "Mutton Charsi Handi": [2050, 4000],
          "Mutton Green Handi": [2100, 4100],
          "Mutton Lahori Handi": [2150, 4200],
          "Mutton Paneer Handi": [2250, 4300],
        };
        const [hp, fp] = priceMap[name] || [2100, 4100];
        return {
          name: name === "Arabic Spe. Zaitoon Handi" ? "Mutton Arabic Spe. Zaitoon Handi" : name,
          cat: "Mutton Handi", price: hp,
          variants: [
            { name: "Half", price: hp, recipeKey: base + " HALF", sort: 1 },
            { name: "Full", price: fp, recipeKey: base + " FULL", sort: 2 },
          ]
        } as ItemDef;
      }),
      // === DUMBA KARAHI ===
      ...["Dumba Shinwari Karahi", "Dumba Khara Ghowasha", "Dumba White Karahi", "Dumba Red Karahi", "Dumba Peshawari Karahi", "Dumba Charsi Karahi", "Dumba Black Paper Karahi", "Dumba Sulemani Karahi", "Dumba Brown Karahi", "Dumba Green Karahi", "Dumba Makhni Karahi", "Dumba Achari Karahi"].map(name => {
        const halfP = name.includes("White") || name.includes("Makhni") ? 1950 : name.includes("Black") || name.includes("Sulemani") || name.includes("Brown") || name.includes("Green") || name.includes("Achari") ? 1950 : 1950;
        const fullP = name.includes("Khara") ? 3700 : name.includes("Red") ? 3750 : 3850;
        return {
          name, cat: "Dumba Karahi", price: halfP,
          variants: [
            { name: "Half", price: halfP, recipeKey: "DUMBA SHINWARI KARAHI HALF", sort: 1 },
            { name: "Full", price: fullP, recipeKey: "DUMBA SHINWARI KARAHI FULL", sort: 2 },
          ]
        } as ItemDef;
      }),
      // === BEEF KARAHI ===
      { name: "Beef Red Karahi", cat: "Beef Karahi", price: 1350, variants: [{ name: "Half", price: 1350, recipeKey: "BEEF RED KARAHI HALF", sort: 1 }, { name: "Full", price: 2650, recipeKey: "BEEF RED KARAHI FULL", sort: 2 }] },
      { name: "Beef White Karahi", cat: "Beef Karahi", price: 1400, variants: [{ name: "Half", price: 1400, recipeKey: "BEEF WHITE KARAHI HALF", sort: 1 }, { name: "Full", price: 2799, recipeKey: "BEEF WHITE KARAHI FULL", sort: 2 }] },
      { name: "Beef Peshawari Karahi", cat: "Beef Karahi", price: 1350, variants: [{ name: "Half", price: 1350, recipeKey: "BEEF PESHAWARI KARAHI HALF", sort: 1 }, { name: "Full", price: 2700, recipeKey: "BEEF PESHAWARI KARAHI FULL", sort: 2 }] },
      { name: "Beef Charsi Karahi", cat: "Beef Karahi", price: 1350, variants: [{ name: "Half", price: 1350, recipeKey: "BEEF CHARSI KARAHI HALF", sort: 1 }, { name: "Full", price: 2700, recipeKey: "BEEF CHARSI KARAHI FULL", sort: 2 }] },
      { name: "Beef Green Karahi", cat: "Beef Karahi", price: 1350, variants: [{ name: "Half", price: 1350, recipeKey: "BEEF GREEN KARAHI HALF", sort: 1 }, { name: "Full", price: 2700, recipeKey: "BEEF GREEN KARAHI FULL", sort: 2 }] },
      { name: "Beef Keema White", cat: "Beef Karahi", price: 1400, variants: [{ name: "Half", price: 1400, recipeKey: "BEEF KEEMA WHITE HALF", sort: 1 }, { name: "Full", price: 2750, recipeKey: "BEEF KEEMA WHITE FULL", sort: 2 }] },
      { name: "Beef Keema Brown", cat: "Beef Karahi", price: 1350, variants: [{ name: "Half", price: 1350, recipeKey: "BEEF KEEMA BROWN HALF", sort: 1 }, { name: "Full", price: 2599, recipeKey: "BEEF KEEMA BROWN FULL", sort: 2 }] },
      // === BBQ BOTI ===
      ...["Ch. Namkeen Boti", "Malai Boti", "Shangreela Boti", "Chicken Achari Boti", "Beef Behari Boti", "Chicken Behari Boti", "Green Boti", "Tandoori Boti"].map(name => {
        const base = name.replace("Ch. Namkeen Boti", "NAMKEEN BOTI").toUpperCase();
        return {
          name, cat: "BBQ Boti", price: 450,
          variants: [
            { name: "Half", price: recipes[base + " HALF"]?.p || 450, recipeKey: base + " HALF", sort: 1 },
            { name: "Full", price: recipes[base + " FULL"]?.p || 850, recipeKey: base + " FULL", sort: 2 },
          ]
        } as ItemDef;
      }),
      // === MUTTON CHANP ===
      { name: "Mutton Namkeen Chanp", cat: "Mutton Chanp", price: 1800, variants: [
        { name: "Half", price: 1800, recipeKey: "MUTTON NAMKEEN CHANP HALF", sort: 1 },
        { name: "Full", price: 3600, recipeKey: "MUTTON NAMKEEN CHANP FULL", sort: 2 },
      ]},
      { name: "Mutton Namkeen Boti", cat: "Mutton Chanp", price: 2100, variants: [
        { name: "Half", price: 2100, recipeKey: "MUTTON NAMKEEN BOTI HALF", sort: 1 },
        { name: "Full", price: 4200, recipeKey: "MUTTON NAMKEEN BOTI FULL", sort: 2 },
      ]},
      // === TIKKA ===
      { name: "Chicken Tikka (Leg)", cat: "Tikka", price: 400, recipeKey: "CHICKEN TIKKA LEG" },
      { name: "Chicken Tikka (Chest)", cat: "Tikka", price: 450, recipeKey: "CHICKEN TIKKA CHEST" },
      { name: "Balochi Tikka (Leg)", cat: "Tikka", price: 400, recipeKey: "BALOCHI TIKKA LEG" },
      { name: "Malai Tikka", cat: "Tikka", price: 470, recipeKey: "MALAI TIKKA" },
      { name: "Green Tikka", cat: "Tikka", price: 470, recipeKey: "GREEN TIKKA" },
      // === BBQ KABAB ===
      { name: "Beef Gola Kabab", cat: "BBQ Kabab", price: 450, variants: [
        { name: "Half", price: 450, recipeKey: "BEEF GOLA KABAB HALF", sort: 1 },
        { name: "Full", price: 800, recipeKey: "BEEF GOLA KABAB FULL", sort: 2 },
      ]},
      { name: "Chicken Gola Kabab", cat: "BBQ Kabab", price: 450, variants: [
        { name: "Half", price: 450, recipeKey: "CHICKEN GOLA KABAB HALF", sort: 1 },
        { name: "Full", price: 800, recipeKey: "CHICKEN GOLA KABAB FULL", sort: 2 },
      ]},
      { name: "Chicken Reshmi Kabab", cat: "BBQ Kabab", price: 450, variants: [
        { name: "Half", price: 450, recipeKey: "CHICKEN RESHMI KABAB HALF", sort: 1 },
        { name: "Full", price: 800, recipeKey: "CHICKEN RESHMI KABAB FULL", sort: 2 },
      ]},
      { name: "Beef Seekh Kabab (Piece)", cat: "BBQ Kabab", price: 50, recipeKey: "BEEF SEEKH KABAB" },
      // === MANDI ===
      { name: "Arabic Chicken Mandi", cat: "Mandi", price: 999, variants: [
        { name: "Half", price: 999, recipeKey: "SINGLE ARABIC CHICKEN MANDI", sort: 1 },
        { name: "Full", price: 1950, recipeKey: "FULL ARABIC CHICKEN MANDI", sort: 2 },
      ]},
      { name: "1 Person Mutton Mandi", cat: "Mandi", price: 1499, recipeKey: "1 PERSON MANDI" },
      { name: "3 Person Mutton Mandi", cat: "Mandi", price: 3899 },
      { name: "Arabic Special Mutton Mandi", cat: "Mandi", price: 3999, recipeKey: "3 PERSON MANDI" },
      { name: "4 Person Mutton Mandi", cat: "Mandi", price: 4999, recipeKey: "4 PERSON MANDI" },
      { name: "9 Person Mutton Mandi", cat: "Mandi", price: 8999 },
      // === PLATTER ===
      { name: "2 Person Platter", cat: "Platter", price: 1799, recipeKey: "2 PERSON PLATTER" },
      { name: "3 Person Platter", cat: "Platter", price: 2499, recipeKey: "3 PERSON PLATTER" },
      { name: "5 Person Platter", cat: "Platter", price: 3599, recipeKey: "5 PERSON PLATTER" },
      { name: "2 Person Rice Platter", cat: "Platter", price: 1800 },
      { name: "3 Person Rice Platter", cat: "Platter", price: 2499 },
      { name: "5 Person Rice Platter", cat: "Platter", price: 3599 },
      { name: "6 Person Rice Platter", cat: "Platter", price: 4999 },
      { name: "9 Person Family Platter", cat: "Platter", price: 6599 },
      { name: "Special BBQ Platter 3 Person", cat: "Platter", price: 2499 },
      // === AFGHANI ===
      { name: "Afghani Pulao", cat: "Afghani", price: 400, variants: [
        { name: "Half", price: 400, recipeKey: "AFGHANI PULAO HALF", sort: 1 },
        { name: "Full", price: 650, recipeKey: "AFGHANI PULAO FULL", sort: 2 },
      ]},
      { name: "Beef Afghani Boti", cat: "Afghani", price: 550, variants: [
        { name: "Half", price: 550, recipeKey: "BEEF AFGHANI BOTI HALF", sort: 1 },
        { name: "Full", price: 1000, recipeKey: "BEEF AFGHANI BOTI FULL", sort: 2 },
      ]},
      { name: "Mutton Namkeen", cat: "Afghani", price: 300 },
      { name: "Single Plan Pulao", cat: "Afghani", price: 300, recipeKey: "SINGLE PLAN PULAO" },
      // === SAJJI ===
      { name: "Balochi Special Sajji", cat: "Sajji", price: 700, variants: [
        { name: "Half", price: 700, recipeKey: "HALF SAJJI", sort: 1 },
        { name: "Full", price: 1400, recipeKey: "FULL SAJJI", sort: 2 },
      ]},
      // === BIRYANI ===
      { name: "Chicken Matka Biryani", cat: "Biryani", price: 1000, variants: [
        { name: "Single", price: 1000, recipeKey: "CHICKEN MATKA BIRYANI SINGLE", sort: 1 },
        { name: "Double", price: 2000, recipeKey: "CHICKEN MATKA BIRYANI DOUBLE", sort: 2 },
      ]},
      { name: "Beef Matka Biryani", cat: "Biryani", price: 1500, variants: [
        { name: "Single", price: 1500, recipeKey: "BEEF MATKA BIRYANI SINGLE", sort: 1 },
        { name: "Double", price: 3000, recipeKey: "BEEF MATKA BIRYANI DOUBLE", sort: 2 },
      ]},
      // === FISH ===
      { name: "Green Grill Fish", cat: "Fish", price: 1799, desc: "Per KG", recipeKey: "GREEN GRILL FISH" },
      { name: "Red Grill Fish", cat: "Fish", price: 1699, desc: "Per KG", recipeKey: "RED GRILL FISH" },
      // === TANDOOR ===
      { name: "Naan", cat: "Tandoor", price: 40, recipeKey: "NAAN" },
      { name: "Nan Til Wala", cat: "Tandoor", price: 50, recipeKey: "NAN TIL WALA" },
      { name: "Qandhari Naan", cat: "Tandoor", price: 80, recipeKey: "QANDHARI NAAN" },
      { name: "Garlic Naan", cat: "Tandoor", price: 70, recipeKey: "GARLIC NAAN" },
      { name: "Chapati", cat: "Tandoor", price: 30, recipeKey: "CHAPATI" },
      { name: "Paratha", cat: "Tandoor", price: 60, recipeKey: "PARATHA" },
      // === SOUP ===
      { name: "Soup", cat: "Soup", price: 150, recipeKey: "SOUP" },
      { name: "Special Soup", cat: "Soup", price: 200, recipeKey: "SPECIAL SOUP" },
      // === SALAD & SIDES ===
      { name: "Fresh Salad", cat: "Salad & Sides", price: 140, recipeKey: "FRESH SALAD" },
      { name: "Raita Zeera", cat: "Salad & Sides", price: 140, recipeKey: "RAITA ZEERA" },
      { name: "B.B.Q Sauce", cat: "Salad & Sides", price: 50 },
      { name: "Tomato Sauce", cat: "Salad & Sides", price: 50 },
      // === BAKRA ===
      { name: "Salim Bakra 1KG", cat: "Afghani", price: 3299, recipeKey: "SALIM BAKRA 1KG" },
      { name: "Salim Bakra With Rice", cat: "Afghani", price: 3599, recipeKey: "SALIM BAKRA WITH RICE" },
      // === TEA & BEVERAGES ===
      { name: "Chai", cat: "Tea & Beverages", price: 120, recipeKey: "FULL CHAI" },
      { name: "Green Tea", cat: "Tea & Beverages", price: 60, recipeKey: "GREEN TEA" },
      { name: "Green Tea Thermos", cat: "Tea & Beverages", price: 250, recipeKey: "GREEN TEA THERMOS" },
      { name: "Sulemani Kehwa", cat: "Tea & Beverages", price: 60, recipeKey: "SULEMANI KEHWA" },
      { name: "Malai Khopra Chai", cat: "Tea & Beverages", price: 120, recipeKey: "MALAI KHOPRA CHAI" },
      // === COLD DRINKS ===
      { name: "Small Water", cat: "Cold Drinks", price: 50, recipeKey: "SMALL WATER" },
      { name: "Large Water", cat: "Cold Drinks", price: 110, recipeKey: "LARGE WATER" },
      { name: "200ml Coldrink", cat: "Cold Drinks", price: 50 },
      { name: "300ml Coldrink", cat: "Cold Drinks", price: 100, recipeKey: "300ML COLD DRINK" },
      { name: "500ml Coldrink", cat: "Cold Drinks", price: 120, recipeKey: "500ML COLD DRINK" },
      { name: "1 Litre Coldrink", cat: "Cold Drinks", price: 190, recipeKey: "1 LITRE COLD DRINK" },
      { name: "1.5 Litre Coldrink", cat: "Cold Drinks", price: 250, recipeKey: "1.5 LITRE COLD DRINK" },
      { name: "Jumbo Coldrink", cat: "Cold Drinks", price: 300, recipeKey: "JUMBO COLD DRINK" },
      { name: "200ml Sting", cat: "Cold Drinks", price: 80 },
      { name: "300ml Sting", cat: "Cold Drinks", price: 120, recipeKey: "300ML STRING" },
      { name: "500ml Sting", cat: "Cold Drinks", price: 140, recipeKey: "500ML STRING" },
      { name: "Sugar Cane Juice", cat: "Cold Drinks", price: 100 },
      // === DESSERTS ===
      { name: "Cheese Kunafa", cat: "Desserts", price: 650, recipeKey: "CHEESE KUNAFA" },
      { name: "Chocolate Kunafa", cat: "Desserts", price: 750, recipeKey: "CHOCOLATE KUNAFA" },
      { name: "Matka Kheer", cat: "Desserts", price: 250, recipeKey: "MATKA KHEER" },
      { name: "Cloud Cheese Kunafa Naan", cat: "Desserts", price: 600 },
      { name: "Pizza Chocolate Paratha", cat: "Desserts", price: 550 },
      { name: "Creamy Lazania", cat: "Desserts", price: 500 },
      // === ICE CREAM ===
      { name: "Ice Cream", cat: "Ice Cream", price: 100, desc: "Flavors: Mango, White Vanilla, Caramel Crunch, King Kulfa, Cookies & Cream, Strawberry, Pistachio, Chocolate, Shahi Kulfa, Praline", variants: [
        { name: "Small", price: 100, recipeKey: "ICE CREAM SMALL", sort: 1 },
        { name: "Large", price: 200, recipeKey: "ICE CREAM LARGE", sort: 2 },
      ]},
      // === DEALS ===
      { name: "Student Deal", cat: "Deals", price: 1370, desc: "1 Zinger Burger + 1 Patty Burger + 1 Grill Shawarma + 5 Pcs Nuggets + 1 Litre Cold Drink" },
      { name: "Friend Deal", cat: "Deals", price: 1230, desc: "2 Zinger Burger + 5 Pcs Nuggets + 2 x 300ml Drink" },
      { name: "Family Deal", cat: "Deals", price: 2480, desc: "5 Zinger Burger + 5 Pcs Nuggets + 1.5 Litre Drink" },
      { name: "Crispy Deal", cat: "Deals", price: 2050, desc: "4 Zinger Burger + 5 Pcs Nuggets + 1 Litre Drink" },
      { name: "Masti Deal", cat: "Deals", price: 1350, desc: "2 Grill Burger + 5 Nuggets + 500ml Drink" },
      { name: "Combo Deal", cat: "Deals", price: 1620, desc: "4 Patty Burger + 5 Pcs Nuggets + 1 Litre Drink" },
      { name: "Couple Deal", cat: "Deals", price: 1050, desc: "1 Zinger Burger + 1 Zinger Shawarma + 5 Pcs Nuggets + 300ml Drink" },
      { name: "Kids Deal", cat: "Deals", price: 999, desc: "2 Patty Burger + 5 Pcs Nuggets + 500ml Drink" },
      { name: "Deal 1", cat: "Deals", price: 850, desc: "1 Small Pizza + 1 Zinger Burger + 500ml Drink" },
      { name: "Deal 2", cat: "Deals", price: 1200, desc: "1 Pizza Paratha + 1 Cloud Naan + 500ml Drink" },
      { name: "Deal 3", cat: "Deals", price: 2370, desc: "1 Large Pizza + 3 Zinger Burger + 1 Litre Drink" },
      { name: "Deal 4", cat: "Deals", price: 1620, desc: "1 Medium Pizza + 2 Zinger Burger + 1 Litre Drink" },
      { name: "Deal 5", cat: "Deals", price: 2499, desc: "1 Large Pizza + 2 Zinger Roll + 1 Pizza Fries + 1 Litre Drink" },
    ];

    // Step 4: Insert menu items and variants
    let itemCount = 0;
    let variantCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const catId = catMap[item.cat];
      if (!catId) { errors.push(`Category not found: ${item.cat}`); continue; }

      let itemRecipe: any[] = [];
      let itemCost = 0;
      let itemMargin = 0;
      if (item.recipeKey && !item.variants) {
        const r = getRecipe(item.recipeKey);
        itemRecipe = r.recipe;
        itemCost = r.recipeCost;
        itemMargin = r.profitMargin;
      }

      const { data: menuItem, error: err } = await sb.from("menu_items").insert({
        name: item.name,
        description: item.desc || "",
        price: item.price,
        category_id: catId,
        is_available: true,
        recipe: item.variants ? [] : itemRecipe,
        recipe_cost: item.variants ? 0 : itemCost,
        profit_margin: item.variants ? 0 : itemMargin,
      }).select().single();

      if (err) { errors.push(`Item error ${item.name}: ${err.message}`); continue; }
      itemCount++;

      if (item.variants && menuItem) {
        for (const v of item.variants) {
          const vr = v.recipeKey ? getRecipe(v.recipeKey) : { recipe: [], recipeCost: 0, profitMargin: 0 };
          const { error: ve } = await sb.from("menu_item_variants").insert({
            menu_item_id: menuItem.id,
            name: v.name,
            price: v.price,
            sort_order: v.sort,
            is_available: true,
            recipe: vr.recipe,
            recipe_cost: vr.recipeCost,
            profit_margin: vr.profitMargin,
          });
          if (ve) errors.push(`Variant error ${item.name}/${v.name}: ${ve.message}`);
          else variantCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      categories: catRows?.length || 0,
      items: itemCount,
      variants: variantCount,
      ingredients: Object.keys(ingMap).length,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
