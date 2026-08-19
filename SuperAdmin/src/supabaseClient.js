// SuperAdmin/src/supabaseClient.js
import { StorageService } from './core/storage';
import { supabase, isSupabaseConfigured } from './core/supabase';

export const db = {
  getResidents: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('profiles').select('*');
        if (data && data.length > 0) {
          const filtered = data.filter((r) => {
            const role = (r.role || r.user_role || '').toLowerCase();
            return role === 'resident' || role === 'user';
          });

          if (filtered.length > 0) {
            return filtered.map((r) => ({
              id: r.id,
              fullName: r.full_name || r.fullName || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Resident',
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Supabase fetch residents notice:', err);
    }

    return [];
  },
};
