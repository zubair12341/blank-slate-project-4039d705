# Complete Migration Guide: Create 2 Independent Copies of Arabic Shinwari POS

## Overview
This guide will help you create **2 separate copies** of your POS application, each connected to its own **external Supabase database** with a full copy of all data.

---

## STEP 1: Create Two New Supabase Projects

1. Go to [https://supabase.com](https://supabase.com) and create an account (free tier works)
2. Create **Project 1** (e.g., "Arabic Shinwari - Branch 1")
3. Create **Project 2** (e.g., "Arabic Shinwari - Branch 2")
4. For each project, note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (found in Settings → API)
   - **Service Role Key** (found in Settings → API — keep this secret!)

---

## STEP 2: Set Up Database Schema (Do this for BOTH projects)

1. In each Supabase project, go to **SQL Editor**
2. Copy the entire contents of `public/combined_schema.sql` from this project
3. Paste and **Run** it in the SQL Editor
4. This will create all 16 tables, RLS policies, functions, triggers, and default data

---

## STEP 3: Import Your Data (Do this for BOTH projects)

### Option A: Using the JSON Data Export (Recommended)

1. In your **current** Lovable project, open the browser and navigate to:
   ```
   https://kbcsrbacakarlrubafpm.supabase.co/functions/v1/export-database
   ```
   Add the header: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NyYmFjYWthcmxydWJhZnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjIwNzksImV4cCI6MjA4MzI5ODA3OX0.syvdsWq7dEsbVdIf0WP9RLW0MVRUxu2RKX-y9X3Yp0U`

2. Save the JSON response as `database_export.json`

3. For each new Supabase project, use the **SQL Editor** to insert data. Use the SQL INSERT statements below.

### Option B: Manual SQL INSERT (Data included below)

Go to SQL Editor in your new Supabase project and run the data import SQL file: `public/data_import.sql`

**IMPORTANT**: Run the SQL in this exact order (due to foreign key dependencies):
1. `ingredients` (no dependencies)
2. `menu_categories` (no dependencies)
3. `menu_items` (depends on menu_categories)
4. `menu_item_variants` (depends on menu_items)
5. `waiters` (no dependencies)
6. `restaurant_tables` (no dependencies)
7. `restaurant_settings` (no dependencies, but delete defaults first)
8. `orders` (no dependencies for basic insert)
9. `order_items` (depends on orders)
10. `stock_purchases` (depends on ingredients)
11. `stock_transfers` (depends on ingredients)
12. `stock_removals` (depends on ingredients)
13. `stock_sales` (depends on ingredients)
14. `expenses` (no dependencies)

**NOTE on users**: `profiles` and `user_roles` are linked to auth.users. You'll need to create new admin users in each Supabase project separately (see Step 5).

---

## STEP 4: Get the Code via GitHub

1. In your current Lovable project: **Settings → Connectors → GitHub → Connect**
2. Create a repository (this pushes your full codebase)
3. Clone the repo to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```

### For Project Copy 1:
4. Create a **new Lovable project** (blank)
5. Go to **Settings → Connectors → Supabase** and connect your **Supabase Project 1**
6. Push the cloned code to this new project's GitHub repo

### For Project Copy 2:
7. Create another **new Lovable project** (blank)
8. Go to **Settings → Connectors → Supabase** and connect your **Supabase Project 2**
9. Push the cloned code to this project's GitHub repo

### Alternative (Without Lovable):
If you want to self-host:
1. Clone the repo
2. Create `.env` file with:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```
3. Run `npm install && npm run build`
4. Deploy the `dist/` folder to any hosting (Vercel, Netlify, VPS)

---

## STEP 5: Create Admin Users (Do this for EACH new Supabase project)

### Method 1: Via Supabase Dashboard
1. Go to your new Supabase project → **Authentication → Users**
2. Click **Add User** → Enter email and password
3. Then in **SQL Editor**, run:
   ```sql
   -- Replace USER_ID with the actual UUID from the Users table
   INSERT INTO public.user_roles (user_id, role) VALUES ('USER_ID_HERE', 'admin');
   ```

### Method 2: Via the Edge Function (already in code)
The `create-admin` edge function exists in the codebase. Deploy it and call it with the admin credentials.

---

## STEP 6: Update the Client Configuration

The file `src/integrations/supabase/client.ts` will auto-generate when you connect your Supabase project in Lovable. If self-hosting, update it manually:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## STEP 7: Deploy Edge Functions

If using Lovable with connected Supabase, edge functions deploy automatically.

If self-hosting with Supabase CLI:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-admin
supabase functions deploy export-database
supabase functions deploy fill-recipes
supabase functions deploy import-menu
supabase functions deploy manage-staff
supabase functions deploy table-update
```

---

## STEP 8: Configure Auth Settings

In each new Supabase project:
1. Go to **Authentication → Settings**
2. Set **Site URL** to your deployed app URL
3. Add redirect URLs if needed
4. Configure email templates if desired

---

## Summary Checklist

| Step | Action | Project 1 | Project 2 |
|------|--------|-----------|-----------|
| 1 | Create Supabase project | ☐ | ☐ |
| 2 | Run combined_schema.sql | ☐ | ☐ |
| 3 | Import data (data_import.sql) | ☐ | ☐ |
| 4 | Connect code via GitHub | ☐ | ☐ |
| 5 | Create admin user | ☐ | ☐ |
| 6 | Update .env / client config | ☐ | ☐ |
| 7 | Deploy edge functions | ☐ | ☐ |
| 8 | Configure auth settings | ☐ | ☐ |

---

## Files You Need

| File | Purpose |
|------|---------|
| `public/combined_schema.sql` | Database structure (tables, RLS, functions) |
| `public/data_import.sql` | All data INSERT statements |
| `public/COMPLETE_MIGRATION_GUIDE.md` | This guide |
| Full codebase (via GitHub) | The application code |

---

## Important Notes

- **Users/Auth**: Each Supabase project has its own auth system. Users from the original project won't exist in the new ones. Create new users.
- **Passwords**: The `security_cancel_password` in restaurant_settings is stored as plain text (currently '12345'). Change it after setup.
- **Realtime**: Enabled for orders, ingredients, menu_items, restaurant_tables, stock_removals, stock_sales. This is handled by the schema SQL.
- **Storage**: If you have uploaded images/logos, you'll need to manually copy those to the new projects' storage buckets.
