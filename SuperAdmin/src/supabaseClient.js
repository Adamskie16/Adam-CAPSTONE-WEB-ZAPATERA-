import { StorageService } from './core/storage';
import { supabase, isSupabaseConfigured } from './core/supabase';

export const db = {
  getResidents: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('profiles').select('*').eq('role', 'resident');
        if (data && data.length > 0) {
          return data.map((r) => ({
            id: r.id,
            fullName: r.full_name || r.fullName || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Resident',
          }));
        }
      }
    } catch (err) {
      console.warn('Supabase fetch residents fallback:', err);
    }

    // Storage Service requests fallback
    const requests = StorageService.getRequests() || [];
    const uniqueMap = new Map();
    requests.forEach((req) => {
      if (req.resident_name) {
        uniqueMap.set(req.resident_id || req.resident_name, {
          id: req.resident_id || req.resident_name,
          fullName: req.resident_name,
        });
      }
    });

    const defaultList = Array.from(uniqueMap.values());
    if (defaultList.length > 0) return defaultList;

    return [
      { id: '1', fullName: 'Juan Dela Cruz' },
      { id: '2', fullName: 'Ana Reyes' },
      { id: '3', fullName: 'Maria Santos' },
      { id: '4', fullName: 'Pedro Penduko' },
    ];
  },
};
