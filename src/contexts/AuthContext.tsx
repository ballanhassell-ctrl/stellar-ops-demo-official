import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { isStaticDataMode } from '../config/dataMode';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'admin@dashboard.local';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isStaticDataMode());

  const isAdmin = isStaticDataMode() || session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    // In demo mode, skip all Supabase auth — no login needed
    if (isStaticDataMode()) return;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (isStaticDataMode()) return { error: null };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: 'Invalid email or password. Please try again.' };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isStaticDataMode()) {
      await supabase.auth.signOut();
    }
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
