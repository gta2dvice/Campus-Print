import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://npxfzhzzrdmuscrzajrz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn(
    '[Campus Print Auth] VITE_SUPABASE_ANON_KEY is not defined in your environment variables. ' +
    'Please add VITE_SUPABASE_ANON_KEY to client-react/.env to enable live Supabase Auth.'
  );
}

// Client will persist session automatically in localStorage
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'dummy-anon-key-placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});
