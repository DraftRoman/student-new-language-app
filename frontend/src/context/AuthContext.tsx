import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, apiRegister, apiLogin, apiLogout, apiChangePassword } from '../lib/authApi';

interface AuthContextValue {
  user:           AuthUser | null;
  loading:        boolean;
  login:          (email: string, password: string) => Promise<void>;
  register:       (name: string, email: string, password: string) => Promise<void>;
  logout:         () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          name:  session.user.user_metadata?.name ?? '',
          email: session.user.email ?? '',
        });
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          name:  session.user.user_metadata?.name ?? '',
          email: session.user.email ?? '',
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  };

  const register = async (name: string, email: string, password: string) => {
    const u = await apiRegister(name, email, password);
    setUser(u);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    await apiChangePassword(newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
