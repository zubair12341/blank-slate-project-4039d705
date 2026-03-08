import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get ingredient name→id map
    const { data: ings } = await sb.from("ingredients").select("id, name, cost_per_unit");
    const ingMap: Record<string, { id: string; cost: number }> = {};
    for (const i of ings || []) ingMap[i.name.toUpperCase().trim()] = { id: i.id, cost: Number(i.cost_per_unit) };

    type RI = { n: string; q: number };
    const buildRecipe = (items: RI[]) => {
      const agg: Record<string, { ingredientId: string; quantity: number }> = {};
      for (const item of items) {
        const info = ingMap[item.n.toUpperCase().trim()];
        if (!info) continue;
        if (agg[info.id]) agg[info.id].quantity += item.q;
        else agg[info.id] = { ingredientId: info.id, quantity: item.q };
      }
      return Object.values(agg);
    };

    const calcCost = (items: RI[]) => {
      let cost = 0;
      const agg: Record<string, number> = {};
      for (const item of items) {
        const info = ingMap[item.n.toUpperCase().trim()];
        if (!info) continue;
        agg[info.id] = (agg[info.id] || 0) + item.q;
      }
      for (const [id, qty] of Object.entries(agg)) {
        const ing = (ings || []).find(i => i.id === id);
        if (ing) cost += Number(ing.cost_per_unit) * qty;
      }
      return Math.round(cost * 100) / 100;
    };

    // ============ RECIPE DATA FROM EXCEL ============
    // Standard mutton handi base (Full: 1000g mutton, Half: 500g)
    const muttonHandiStdFull: RI[] = [
      { n: "BLACK PAPER", q: 10 }, { n: "DAHI", q: 150 }, { n: "DHANIYA", q: 10 },
      { n: "GARM MASLA", q: 10 }, { n: "HALDI", q: 6 }, { n: "KARAHI MASLA", q: 10 },
      { n: "MUTTON", q: 1000 }, { n: "OIL", q: 230 }, { n: "SALT", q: 10 },
      { n: "SB ADRAK", q: 10 }, { n: "SB HARI MIRCH", q: 25 }, { n: "SB LAHSAN", q: 10 },
      { n: "SB TAMTOR", q: 10 }, { n: "WHITE PAPER", q: 10 }, { n: "ZEERA", q: 10 },
    ];
    const muttonHandiStdHalf: RI[] = [
      { n: "BLACK PAPER", q: 5 }, { n: "DAHI", q: 100 }, { n: "DHANIYA", q: 5 },
      { n: "GARM MASLA", q: 5 }, { n: "HALDI", q: 3 }, { n: "KARAHI MASLA", q: 5 },
      { n: "MUTTON", q: 500 }, { n: "OIL", q: 150 }, { n: "SALT", q: 5 },
      { n: "SB ADRAK", q: 5 }, { n: "SB HARI MIRCH", q: 15 }, { n: "SB LAHSAN", q: 5 },
      { n: "SB TAMTOR", q: 500 }, { n: "WHITE PAPER", q: 5 }, { n: "ZEERA", q: 5 },
    ];

    // Mutton Black Pepper Handi (no garm masla/karahi masla/dhaniya, uses tamtor 600)
    const mBPHandiFull: RI[] = [
      { n: "BLACK PAPER", q: 15 }, { n: "DAHI", q: 100 }, { n: "MUTTON", q: 1000 },
      { n: "OIL", q: 200 }, { n: "SALT", q: 10 }, { n: "SB TAMTOR", q: 600 },
      { n: "WHITE PAPER", q: 10 }, { n: "ZEERA", q: 10 },
    ];
    const mBPHandiHalf: RI[] = [
      { n: "BLACK PAPER", q: 5 }, { n: "DAHI", q: 70 }, { n: "MUTTON", q: 500 },
      { n: "OIL", q: 150 }, { n: "SALT", q: 5 }, { n: "SB TAMTOR", q: 500 },
      { n: "WHITE PAPER", q: 5 }, { n: "ZEERA", q: 5 },
    ];

    // Mutton Green Handi (cream + green herbs)
    const mGreenHandiFull: RI[] = [
      { n: "BLACK PAPER", q: 15 }, { n: "CREAM", q: 200 }, { n: "DAHI", q: 100 },
      { n: "MUTTON", q: 1000 }, { n: "OIL", q: 200 }, { n: "SALT", q: 10 },
      { n: "SB HARA DHANIYA", q: 20 }, { n: "SB HARI MIRCH", q: 10 },
      { n: "SB PODINA", q: 10 }, { n: "WHITE PAPER", q: 10 },
    ];
    const mGreenHandiHalf: RI[] = [
      { n: "BLACK PAPER", q: 5 }, { n: "CREAM", q: 100 }, { n: "DAHI", q: 70 },
      { n: "MUTTON", q: 500 }, { n: "OIL", q: 150 }, { n: "SALT", q: 5 },
      { n: "SB HARA DHANIYA", q: 10 }, { n: "SB HARI MIRCH", q: 5 },
      { n: "SB PODINA", q: 5 }, { n: "WHITE PAPER", q: 5 },
    ];

    // Mutton Makhni Handi (cream, no green herbs)
    const mMakhniHandiFull: RI[] = [
      { n: "BLACK PAPER", q: 15 }, { n: "CREAM", q: 200 }, { n: "DAHI", q: 100 },
      { n: "HALDI", q: 10 }, { n: "MUTTON", q: 1000 }, { n: "OIL", q: 200 },
      { n: "SALT", q: 10 }, { n: "WHITE PAPER", q: 10 },
    ];
    const mMakhniHandiHalf: RI[] = [
      { n: "BLACK PAPER", q: 5 }, { n: "CREAM", q: 100 }, { n: "DAHI", q: 70 },
      { n: "HALDI", q: 5 }, { n: "MUTTON", q: 500 }, { n: "OIL", q: 150 },
      { n: "SALT", q: 5 }, { n: "WHITE PAPER", q: 5 },
    ];

    // Mutton White Handi = same as Makhni (cream-based, no paprika)
    const mWhiteHandiFull = mMakhniHandiFull;
    const mWhiteHandiHalf = mMakhniHandiHalf;

    // Mutton Paneer Handi = standard + cheese
    const mPaneerHandiFull: RI[] = [...muttonHandiStdFull, { n: "CHEESE", q: 100 }];
    const mPaneerHandiHalf: RI[] = [...muttonHandiStdHalf, { n: "CHEESE", q: 50 }];

    // Arabic Spe Zaitoon = same as ARABIC SPE MUTTON HANDI from Recipe Excel
    const mZaitoonHandiFull: RI[] = [
      { n: "BADAM", q: 10 }, { n: "BLACK PAPER", q: 10 }, { n: "DAHI", q: 150 },
      { n: "DHANIYA", q: 10 }, { n: "MUTTON", q: 1000 }, { n: "OIL", q: 230 },
      { n: "PISTA", q: 10 }, { n: "SALT", q: 10 }, { n: "SB ADRAK", q: 10 },
      { n: "SB HARI MIRCH", q: 25 }, { n: "SB LAHSAN", q: 10 },
      { n: "SB TAMTOR", q: 10 }, { n: "WHITE PAPER", q: 10 }, { n: "ZEERA", q: 10 },
    ];
    const mZaitoonHandiHalf: RI[] = [
      { n: "BADAM", q: 5 }, { n: "BLACK PAPER", q: 5 }, { n: "DAHI", q: 100 },
      { n: "DHANIYA", q: 5 }, { n: "MUTTON", q: 500 }, { n: "OIL", q: 150 },
      { n: "PISTA", q: 5 }, { n: "SALT", q: 5 }, { n: "SB ADRAK", q: 5 },
      { n: "SB HARI MIRCH", q: 15 }, { n: "SB LAHSAN", q: 5 },
      { n: "SB TAMTOR", q: 500 }, { n: "WHITE PAPER", q: 5 }, { n: "ZEERA", q: 5 },
    ];

    // Now build the mapping: variant_name_pattern → { item_name_pattern, variant_name, recipe }
    // We'll match by item name + variant name (case insensitive)
    type RecipeMatch = { recipe: RI[]; };
    // key = "ITEM_NAME|VARIANT_NAME" for variants, "ITEM_NAME|" for items without variants
    const recipeMap: Record<string, RecipeMatch> = {
      // ===== MUTTON HANDI VARIANTS =====
      "Mutton Charsi Handi|Half": { recipe: muttonHandiStdHalf },
      "Mutton Charsi Handi|Full": { recipe: muttonHandiStdFull },
      "Mutton Shinwari Handi|Half": { recipe: muttonHandiStdHalf },
      "Mutton Shinwari Handi|Full": { recipe: muttonHandiStdFull },
      "Mutton Red Handi|Half": { recipe: muttonHandiStdHalf },
      "Mutton Red Handi|Full": { recipe: muttonHandiStdFull },
      "Mutton Peshawari Handi|Half": { recipe: muttonHandiStdHalf },
      "Mutton Peshawari Handi|Full": { recipe: muttonHandiStdFull },
      "Mutton Lahori Handi|Half": { recipe: muttonHandiStdHalf },
      "Mutton Lahori Handi|Full": { recipe: muttonHandiStdFull },
      "Mutton Black Pepper Handi|Half": { recipe: mBPHandiHalf },
      "Mutton Black Pepper Handi|Full": { recipe: mBPHandiFull },
      "Mutton Green Handi|Half": { recipe: mGreenHandiHalf },
      "Mutton Green Handi|Full": { recipe: mGreenHandiFull },
      "Mutton Makhni Handi|Half": { recipe: mMakhniHandiHalf },
      "Mutton Makhni Handi|Full": { recipe: mMakhniHandiFull },
      "Mutton White Handi|Half": { recipe: mWhiteHandiHalf },
      "Mutton White Handi|Full": { recipe: mWhiteHandiFull },
      "Mutton Paneer Handi|Half": { recipe: mPaneerHandiHalf },
      "Mutton Paneer Handi|Full": { recipe: mPaneerHandiFull },
      "Mutton Arabic Spe. Zaitoon Handi|Half": { recipe: mZaitoonHandiHalf },
      "Mutton Arabic Spe. Zaitoon Handi|Full": { recipe: mZaitoonHandiFull },

      // ===== LOADED FRIES VARIANTS =====
      "Cheese Fries|Single": { recipe: [{ n: "SB FRIES", q: 100 }, { n: "CHEESE", q: 50 }] },
      "Cheese Fries|Double": { recipe: [{ n: "SB FRIES", q: 200 }, { n: "CHEESE", q: 100 }] },
      "Pizza Fries|Single": { recipe: [{ n: "SB FRIES", q: 100 }, { n: "CHEESE", q: 60 }, { n: "CHICKEN BOTI", q: 60 }] },
      "Pizza Fries|Double": { recipe: [{ n: "SB FRIES", q: 150 }] },

      // ===== EXTRA TOPPING VARIANTS =====
      "Chicken Cheese Topping|Small": { recipe: [{ n: "CHICKEN BONELESS", q: 30 }, { n: "CHEESE", q: 30 }] },
      "Chicken Cheese Topping|Medium": { recipe: [{ n: "CHICKEN BONELESS", q: 60 }, { n: "CHEESE", q: 60 }] },
      "Chicken Cheese Topping|Large": { recipe: [{ n: "CHICKEN BONELESS", q: 90 }, { n: "CHEESE", q: 90 }] },
    };

    // ===== ITEMS WITHOUT VARIANTS (direct item recipe) =====
    const itemRecipeMap: Record<string, RI[]> = {
      // Cold Drinks
      "200ml Coldrink": [{ n: "300ML COLD DRINK", q: 200 }],
      "200ml Sting": [{ n: "300ML STRING", q: 200 }],
      "Sugar Cane Juice": [], // No ingredient in system

      // Sauces
      "B.B.Q Sauce": [{ n: "IMLI", q: 100 }],
      "Tomato Sauce": [{ n: "KATCHUP", q: 100 }],

      // Sandwiches
      "Bar B.Q. Sandwich": [{ n: "BREAD", q: 2 }, { n: "CHICKEN BONELESS", q: 100 }],
      "Chicken Sandwich": [{ n: "BREAD", q: 2 }, { n: "CHICKEN BONELESS", q: 100 }, { n: "EGGS", q: 1 }, { n: "GHEE", q: 50 }, { n: "KATCHUP", q: 5 }, { n: "MAYO BEST", q: 5 }, { n: "SALT", q: 5 }],
      "Malai Sandwich": [{ n: "CHICKEN BONELESS", q: 100 }],

      // Mutton Namkeen
      "Mutton Namkeen": [{ n: "MUTTON", q: 150 }],

      // Desserts
      "Cloud Cheese Kunafa Naan": [{ n: "CHEESE", q: 100 }, { n: "MAIDA", q: 100 }, { n: "SUGAR", q: 50 }],
      "Creamy Lazania": [{ n: "CHEESE", q: 80 }, { n: "CREAM", q: 100 }, { n: "CHICKEN BONELESS", q: 100 }, { n: "MAIDA", q: 150 }],
      "Pizza Chocolate Paratha": [{ n: "MAIDA", q: 150 }, { n: "CHEESE", q: 60 }],

      // Pasta
      "Pasta": [{ n: "CHEESE", q: 80 }, { n: "CREAM", q: 100 }, { n: "CHICKEN BONELESS", q: 100 }, { n: "MAIDA", q: 150 }],

      // Special Burgers
      "Jalapeno Zinger Burger": [{ n: "CHICKEN THAI", q: 70 }, { n: "BUN L", q: 1 }, { n: "CHEESE SLICE", q: 1 }, { n: "CHILLI GARLIC", q: 25 }, { n: "MAYO", q: 10 }, { n: "MAYO BEST", q: 25 }, { n: "SB BAND GOBHI", q: 10 }, { n: "SB FRIES", q: 50 }],
      "Stiko Sandwich": [{ n: "CHICKEN BOTI", q: 130 }, { n: "BUN L", q: 1 }, { n: "CHEESE SLICE", q: 1 }, { n: "CHILLI GARLIC", q: 25 }, { n: "MAYO", q: 10 }, { n: "MAYO BEST", q: 25 }, { n: "SB BAND GOBHI", q: 20 }, { n: "SB FRIES", q: 50 }],
      "Zinger Pizza Burger": [{ n: "CHICKEN THAI", q: 70 }, { n: "BUN L", q: 1 }, { n: "CHEESE", q: 60 }, { n: "CHILLI GARLIC", q: 25 }, { n: "MAYO", q: 10 }, { n: "MAYO BEST", q: 25 }, { n: "SB FRIES", q: 50 }],

      // Platters
      "2 Person Platter": [{ n: "BEEF", q: 150 }, { n: "CHICKEN BOTI", q: 150 }, { n: "CHICKEN TIKKA LEG", q: 560 }, { n: "RICE", q: 200 }],
      "2 Person Rice Platter": [{ n: "BEEF", q: 150 }, { n: "CHICKEN BOTI", q: 150 }, { n: "CHICKEN TIKKA LEG", q: 560 }, { n: "RICE", q: 200 }],
      "3 Person Platter": [{ n: "BEEF", q: 300 }, { n: "CHICKEN BOTI", q: 300 }, { n: "CHICKEN TIKKA LEG", q: 700 }, { n: "RICE", q: 400 }],
      "3 Person Rice Platter": [{ n: "BEEF", q: 300 }, { n: "CHICKEN BOTI", q: 300 }, { n: "CHICKEN TIKKA LEG", q: 700 }, { n: "RICE", q: 400 }],
      "5 Person Platter": [{ n: "BEEF", q: 150 }, { n: "CHICKEN BOTI", q: 550 }, { n: "CHICKEN TIKKA LEG", q: 560 }, { n: "RICE", q: 600 }],
      "5 Person Rice Platter": [{ n: "BEEF", q: 150 }, { n: "CHICKEN BOTI", q: 550 }, { n: "CHICKEN TIKKA LEG", q: 560 }, { n: "RICE", q: 600 }],
      "6 Person Rice Platter": [{ n: "BEEF", q: 300 }, { n: "CHICKEN BOTI", q: 700 }, { n: "CHICKEN TIKKA LEG", q: 800 }, { n: "RICE", q: 800 }],
      "9 Person Family Platter": [{ n: "BEEF", q: 500 }, { n: "CHICKEN BOTI", q: 1000 }, { n: "CHICKEN TIKKA LEG", q: 1200 }, { n: "RICE", q: 1200 }],
      "Special BBQ Platter 3 Person": [{ n: "BEEF", q: 300 }, { n: "CHICKEN BOTI", q: 300 }, { n: "CHICKEN TIKKA LEG", q: 700 }, { n: "RICE", q: 400 }],

      // Mandi
      "3 Person Mutton Mandi": [{ n: "MUTTON LEG", q: 1000 }, { n: "OIL", q: 100 }, { n: "RICE", q: 400 }],
      "9 Person Mutton Mandi": [{ n: "MUTTON LEG", q: 3000 }, { n: "OIL", q: 300 }, { n: "RICE", q: 1200 }],

      // Deals (composite - approximate based on component items)
      "Deal 1": [{ n: "CHICKEN THAI", q: 70 }, { n: "SB FRIES", q: 100 }, { n: "300ML COLD DRINK", q: 300 }],
      "Deal 2": [{ n: "CHICKEN THAI", q: 140 }, { n: "SB FRIES", q: 150 }, { n: "300ML COLD DRINK", q: 300 }],
      "Deal 3": [{ n: "CHICKEN THAI", q: 210 }, { n: "SB FRIES", q: 200 }, { n: "1 LITRE COLD DRINK", q: 1000 }],
      "Deal 4": [{ n: "CHICKEN BROAST", q: 300 }, { n: "SB FRIES", q: 150 }, { n: "300ML COLD DRINK", q: 300 }],
      "Deal 5": [{ n: "CHICKEN BROAST", q: 600 }, { n: "SB FRIES", q: 200 }, { n: "1 LITRE COLD DRINK", q: 1000 }],
      "Combo Deal": [{ n: "CHICKEN THAI", q: 140 }, { n: "CHICKEN BROAST", q: 300 }, { n: "SB FRIES", q: 200 }, { n: "1 LITRE COLD DRINK", q: 1000 }],
      "Couple Deal": [{ n: "CHICKEN THAI", q: 70 }, { n: "CHICKEN BROAST", q: 300 }, { n: "SB FRIES", q: 100 }, { n: "300ML COLD DRINK", q: 600 }],
      "Crispy Deal": [{ n: "CHICKEN BROAST", q: 600 }, { n: "CHICKEN THAI", q: 140 }, { n: "SB FRIES", q: 200 }, { n: "1.5 LITRE COLD DRINK", q: 1500 }],
      "Family Deal": [{ n: "CHICKEN BROAST", q: 600 }, { n: "CHICKEN THAI", q: 140 }, { n: "SB FRIES", q: 300 }, { n: "1.5 LITRE COLD DRINK", q: 1500 }],
      "Friend Deal": [{ n: "CHICKEN THAI", q: 140 }, { n: "SB FRIES", q: 150 }, { n: "300ML COLD DRINK", q: 600 }],
      "Kids Deal": [{ n: "CHICKEN BROAST", q: 300 }, { n: "SB FRIES", q: 100 }, { n: "300ML COLD DRINK", q: 300 }],
      "Masti Deal": [{ n: "CHICKEN THAI", q: 70 }, { n: "CHICKEN BROAST", q: 300 }, { n: "SB FRIES", q: 150 }, { n: "300ML COLD DRINK", q: 600 }],
      "Student Deal": [{ n: "CHICKEN THAI", q: 140 }, { n: "SB FRIES", q: 150 }, { n: "300ML COLD DRINK", q: 600 }],
    };

    // ===== EXECUTE UPDATES =====
    const log: string[] = [];

    // 1. Update variant recipes
    const { data: allVariants } = await sb.from("menu_item_variants").select("id, name, menu_item_id, recipe, price");
    const { data: allItems } = await sb.from("menu_items").select("id, name, recipe, price, category_id");

    // Build item ID → name map
    const itemNameMap: Record<string, string> = {};
    for (const item of allItems || []) itemNameMap[item.id] = item.name;

    let variantUpdated = 0;
    for (const v of allVariants || []) {
      const recipeArr = v.recipe as unknown[];
      if (recipeArr && Array.isArray(recipeArr) && recipeArr.length > 0) continue; // Already has recipe

      const itemName = itemNameMap[v.menu_item_id];
      if (!itemName) continue;

      const key = `${itemName}|${v.name}`;
      const match = recipeMap[key];
      if (!match) {
        log.push(`VARIANT NOT MATCHED: ${key}`);
        continue;
      }

      const recipe = buildRecipe(match.recipe);
      const cost = calcCost(match.recipe);
      const margin = v.price > 0 ? ((Number(v.price) - cost) / Number(v.price)) * 100 : 0;

      const { error } = await sb.from("menu_item_variants").update({
        recipe: JSON.stringify(recipe),
        recipe_cost: cost,
        profit_margin: Math.round(margin * 100) / 100,
      }).eq("id", v.id);

      if (error) log.push(`ERROR updating variant ${key}: ${error.message}`);
      else { variantUpdated++; log.push(`✅ Variant: ${key} → cost=${cost}`); }
    }

    // 2. Update item recipes (items without variants that have empty recipes)
    let itemUpdated = 0;
    for (const item of allItems || []) {
      const recipeArr = item.recipe as unknown[];
      if (recipeArr && Array.isArray(recipeArr) && recipeArr.length > 0) continue;

      // Check if item has variants
      const hasVariants = (allVariants || []).some(v => v.menu_item_id === item.id);
      if (hasVariants) continue; // Variants handle their own recipes

      const match = itemRecipeMap[item.name];
      if (match === undefined) {
        log.push(`ITEM NOT MATCHED: ${item.name}`);
        continue;
      }

      if (match.length === 0) {
        log.push(`⚠️ Item: ${item.name} → no ingredients in system (placeholder)`);
        continue;
      }

      const recipe = buildRecipe(match);
      const cost = calcCost(match);
      const margin = item.price > 0 ? ((Number(item.price) - cost) / Number(item.price)) * 100 : 0;

      const { error } = await sb.from("menu_items").update({
        recipe: JSON.stringify(recipe),
        recipe_cost: cost,
        profit_margin: Math.round(margin * 100) / 100,
      }).eq("id", item.id);

      if (error) log.push(`ERROR updating item ${item.name}: ${error.message}`);
      else { itemUpdated++; log.push(`✅ Item: ${item.name} → cost=${cost}`); }
    }

    return new Response(JSON.stringify({
      success: true,
      variants_updated: variantUpdated,
      items_updated: itemUpdated,
      log,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
