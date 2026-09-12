import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../api/supabase';
import { Profile } from '../types/database';
import { INITIAL_MOCK_PROFILES } from '../api/mockData';

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isOwner: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser({ id: session.user.id, email: session.user.email });
            // fetch profile
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (prof && mounted) {
              setProfile(prof as Profile);
            }
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
        } finally {
          if (mounted) setIsLoading(false);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email });
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (prof && mounted) setProfile(prof as Profile);
          } else {
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        });

        return () => {
          mounted = false;
          authListener.subscription.unsubscribe();
        };
      } else {
        // Fallback local owner session check
        const defaultOwner = INITIAL_MOCK_PROFILES[0];
        const stored = localStorage.getItem('dostlik_active_owner');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser({ id: parsed.id, email: parsed.email || 'owner@dostlikmarket.uz' });
            setProfile(parsed.profile || defaultOwner);
          } catch {
            setUser({ id: defaultOwner.id, email: 'owner@dostlikmarket.uz' });
            setProfile(defaultOwner);
          }
        } else {
          localStorage.setItem('dostlik_active_owner', JSON.stringify({
            id: defaultOwner.id,
            email: 'owner@dostlikmarket.uz',
            profile: defaultOwner,
          }));
          setUser({ id: defaultOwner.id, email: 'owner@dostlikmarket.uz' });
          setProfile(defaultOwner);
        }
        setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (phoneOrEmail: string, pass: string) => {
    setAuthError(null);
    setIsLoading(true);

    const isPhone = !phoneOrEmail.includes('@');
    const cleanPhone = phoneOrEmail.replace(/\D/g, '');
    const emailToUse = isPhone ? `user_${cleanPhone}@dostlikmarket.uz` : phoneOrEmail;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: pass,
        });
        if (error) throw error;
        if (!data.user) throw new Error('Foydalanuvchi topilmadi');

        // Verify owner role
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pErr || !prof || prof.role !== 'owner') {
          await supabase.auth.signOut();
          throw new Error('Kirish rad etildi: Bu hisob do‘kon egasiga tegishli emas!');
        }

        setUser({ id: data.user.id, email: data.user.email });
        setProfile(prof as Profile);
      } catch (err: any) {
        setAuthError(err.message || 'Kirishda xatolik yuz berdi');
        throw err;
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Local simulated login for testing
    await new Promise((r) => setTimeout(r, 300));
    if (pass.length < 4) {
      const err = 'Parol kamida 4 belgidan iborat bo‘lishi kerak!';
      setAuthError(err);
      setIsLoading(false);
      throw new Error(err);
    }

    const defaultOwnerProfile = INITIAL_MOCK_PROFILES[0];
    const sessionObj = {
      id: defaultOwnerProfile.id,
      email: phoneOrEmail,
      profile: defaultOwnerProfile,
    };
    localStorage.setItem('dostlik_active_owner', JSON.stringify(sessionObj));
    setUser({ id: sessionObj.id, email: phoneOrEmail });
    setProfile(defaultOwnerProfile);
    setIsLoading(false);
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('dostlik_active_owner');
    }
    setUser(null);
    setProfile(null);
  };

  const isOwner = profile?.role === 'owner' || !isSupabaseConfigured();

  return (
    <AuthContext.Provider
      value={{
        user: user || { id: INITIAL_MOCK_PROFILES[0].id, email: 'owner@dostlikmarket.uz' },
        profile: profile || INITIAL_MOCK_PROFILES[0],
        isOwner,
        isLoading,
        login,
        logout,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Safe default owner fallback so app NEVER crashes if context is missing
    const defaultOwner = INITIAL_MOCK_PROFILES[0];
    return {
      user: { id: defaultOwner.id, email: 'owner@dostlikmarket.uz' },
      profile: defaultOwner,
      isOwner: true,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
      authError: null,
    };
  }
  return context;
};
