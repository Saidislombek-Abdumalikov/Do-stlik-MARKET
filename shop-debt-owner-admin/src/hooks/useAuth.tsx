import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../api/supabase';
import { Profile } from '../types/database';
import { INITIAL_MOCK_PROFILES } from '../api/mockData';
import { entriesService } from '../api/entriesService';

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profiles: Profile[];
  selectedProfile: Profile | null;
  setSelectedProfile: (profile: Profile | null) => void;
  isOwner: boolean;
  isLoading: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  updatePinCode: (oldPin: string, newPin: string) => Promise<boolean>;
  login: (phoneOrEmail: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  lockApp: () => void;
  clearError: () => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_MOCK_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(INITIAL_MOCK_PROFILES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const isLocked = localStorage.getItem('dostlik_is_locked') === 'true';
      const storedProfileId = localStorage.getItem('dostlik_active_profile_id');

      // Sync fresh profiles from entriesService/localStorage
      try {
        const freshProfiles = await entriesService.getProfiles();
        if (mounted) setProfiles(freshProfiles);
      } catch (err) {
        console.warn('Profiles load error:', err);
      }

      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted && !isLocked) {
            setUser({ id: session.user.id, email: session.user.email });
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (prof && mounted) {
              setProfile(prof as Profile);
              setSelectedProfile(prof as Profile);
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
        // Fast PIN mode for store:
        const currentProfiles = await entriesService.getProfiles();
        if (mounted) setProfiles(currentProfiles);

        if (!isLocked && storedProfileId) {
          const found = currentProfiles.find((p) => p.id === storedProfileId && p.is_active);
          if (found) {
            setUser({ id: found.id, email: `${found.id}@dostlikmarket.uz` });
            setProfile(found);
            setSelectedProfile(found);
          } else {
            setUser(null);
            setSelectedProfile(currentProfiles[0]);
          }
        } else {
          // Locked screen or first load
          setUser(null);
          const lastActive = storedProfileId
            ? currentProfiles.find((p) => p.id === storedProfileId)
            : null;
          setSelectedProfile(lastActive || currentProfiles[0]);
        }
        setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const clearError = () => setAuthError(null);

  // Direct PIN login: user types their 4-digit PIN without needing to pick an account first
  const loginWithPin = async (pin: string): Promise<boolean> => {
    setAuthError(null);
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 150));

    const currentProfiles = await entriesService.getProfiles();
    setProfiles(currentProfiles);

    // Direct match: matches any active staff member with this PIN
    const matched = currentProfiles.find((prof) => prof.pin_code === pin && prof.is_active);

    if (!matched) {
      setAuthError('Noto‘g‘ri PIN kod! Qaytadan tering.');
      setIsLoading(false);
      return false;
    }

    localStorage.setItem('dostlik_active_profile_id', matched.id);
    localStorage.removeItem('dostlik_is_locked');

    setUser({ id: matched.id, email: `${matched.id}@dostlikmarket.uz` });
    setProfile(matched);
    setSelectedProfile(matched);
    setIsLoading(false);
    return true;
  };

  // Change PIN code for current logged in user
  const updatePinCode = async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!profile) throw new Error('Tizimga kirmagansiz');
    if (profile.pin_code && profile.pin_code !== oldPin) {
      throw new Error('Hozirgi PIN kod noto‘g‘ri kiritildi');
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      throw new Error('Yangi PIN kod 4 ta raqamdan iborat bo‘lishi kerak');
    }
    const updated = await entriesService.updatePinCode(profile.id, newPin);
    setProfile(updated);
    setSelectedProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    return true;
  };

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

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pErr || !prof) {
          throw new Error('Foydalanuvchi profili topilmadi');
        }

        setUser({ id: data.user.id, email: data.user.email });
        setProfile(prof as Profile);
        setSelectedProfile(prof as Profile);
      } catch (err: any) {
        setAuthError(err.message || 'Kirishda xatolik yuz berdi');
        throw err;
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Local fallback
    const matched = INITIAL_MOCK_PROFILES.find(
      (p) => p.phone?.replace(/\D/g, '') === cleanPhone || p.pin_code === pass
    ) || INITIAL_MOCK_PROFILES[0];

    localStorage.setItem('dostlik_active_profile_id', matched.id);
    localStorage.removeItem('dostlik_is_locked');
    setUser({ id: matched.id, email: `${matched.id}@dostlikmarket.uz` });
    setProfile(matched);
    setSelectedProfile(matched);
    setIsLoading(false);
  };

  const lockApp = () => {
    localStorage.setItem('dostlik_is_locked', 'true');
    setUser(null);
    setAuthError(null);
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('dostlik_active_profile_id');
    localStorage.setItem('dostlik_is_locked', 'true');
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const isOwner = profile?.role === 'owner';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profiles,
        selectedProfile,
        setSelectedProfile,
        isOwner,
        isLoading,
        loginWithPin,
        updatePinCode,
        login,
        logout,
        lockApp,
        clearError,
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
    const defaultOwner = INITIAL_MOCK_PROFILES[0];
    return {
      user: null,
      profile: defaultOwner,
      profiles: INITIAL_MOCK_PROFILES,
      selectedProfile: defaultOwner,
      setSelectedProfile: () => {},
      isOwner: true,
      isLoading: false,
      loginWithPin: async () => false,
      updatePinCode: async () => false,
      login: async () => {},
      logout: async () => {},
      lockApp: () => {},
      clearError: () => {},
      authError: null,
    };
  }
  return context;
};
