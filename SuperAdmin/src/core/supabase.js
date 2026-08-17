// Admin/src/core/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://qzmxwxmtuzoanwevftnd.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXh3eG10dXpvYW53ZXZmdG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODIwMjQsImV4cCI6MjA5OTY1ODAyNH0.eUsrHf8qnYmx5SF_BTR0L9Hma4OkQZkSg0APrr8LgOg';

const supabaseServiceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env?.VITE_SUPABASE_URL &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY
  );
};

export const signUpUserWithoutPersistSession = async ({ email, password, metadata }) => {
  try {
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
      },
    });
    if (error) {
      console.warn('Unpersisted signUp notice:', error.message);
      return { id: null, error };
    }
    return { id: data?.user?.id || null, error: null };
  } catch (err) {
    console.warn('Unpersisted signUp exception notice:', err);
    return { id: null, error: err };
  }
};
