import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wzmraketqyzvpagcdyyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXJha2V0cXl6dnBhZ2NkeXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODQxMDAsImV4cCI6MjA4ODU2MDEwMH0.yHQAihqhGnxEcWJWUXrl2WMJabQuH19JgpC60Gl8rok";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});