import { createClient } from '@supabase/supabase-js';
import { MobileStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qzmxwxmtuzoanwevftnd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXh3eG10dXpvYW53ZXZmdG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODIwMjQsImV4cCI6MjA5OTY1ODAyNH0.eUsrHf8qnYmx5SF_BTR0L9Hma4OkQZkSg0APrr8LgOg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: MobileStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
