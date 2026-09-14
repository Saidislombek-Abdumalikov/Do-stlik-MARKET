import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Canonical Supabase Project Credentials for Do'stlik MARKET
export const DEFAULT_SUPABASE_URL = 'https://jgjkcfthntogvcmenjij.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnamtjZnRobnRvZ3ZjbWVuamlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzIyNzQsImV4cCI6MjEwNDkwODI3NH0.VqUrXm_heKatxoqgDHdm64otBgOACnHXhS3VveJOY64';

// Read from import.meta.env, with fallback to hard defaults and window/localStorage
export const getSupabaseConfig = () => {
  let url =
    (typeof import.meta !== 'undefined' && import.meta?.env
      ? ((import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string)
      : '') || DEFAULT_SUPABASE_URL;
  let key =
    (typeof import.meta !== 'undefined' && import.meta?.env
      ? ((import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string)
      : '') || DEFAULT_SUPABASE_ANON_KEY;

  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('dostlik_VITE_SUPABASE_URL');
    const storedKey = localStorage.getItem('dostlik_VITE_SUPABASE_ANON_KEY');
    if (storedUrl && !storedUrl.includes('placeholder')) {
      url = storedUrl;
    } else if (storedUrl && storedUrl.includes('placeholder')) {
      localStorage.removeItem('dostlik_VITE_SUPABASE_URL');
    }

    if (storedKey && !storedKey.includes('placeholder')) {
      key = storedKey;
    } else if (storedKey && storedKey.includes('placeholder')) {
      localStorage.removeItem('dostlik_VITE_SUPABASE_ANON_KEY');
    }
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

export const supabase: SupabaseClient = createClient(
  url && url.startsWith('https://') ? url : DEFAULT_SUPABASE_URL,
  key || DEFAULT_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
