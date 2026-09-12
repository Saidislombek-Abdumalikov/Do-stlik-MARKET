import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from import.meta.env, with fallback to window/localStorage
export const getSupabaseConfig = () => {
  let url = (typeof import.meta !== 'undefined' && import.meta?.env ? (import.meta.env.VITE_SUPABASE_URL as string) : '') || '';
  let key = (typeof import.meta !== 'undefined' && import.meta?.env ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string) : '') || '';

  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('dostlik_VITE_SUPABASE_URL');
    const storedKey = localStorage.getItem('dostlik_VITE_SUPABASE_ANON_KEY');
    if (storedUrl) url = storedUrl;
    if (storedKey) key = storedKey;
  }

  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder') &&
    url.startsWith('https://')
  );
};

const { url, key } = getSupabaseConfig();
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = key;

const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  url && url.startsWith('https://') ? url : fallbackUrl,
  key || fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
