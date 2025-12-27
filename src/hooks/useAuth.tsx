import { createContext, useContext, useEffect, useState } from 'react';
import { api, AUTH_TOKEN_EVENT } from '@/integrations/api/client';

export interface AuthUser {
  id: string;
  email: string;
  businessName?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, businessName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = async (event: Event) => {
      const token = (event as CustomEvent<{ token: string | null }>).detail?.token;

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const me = await api.getMe();
        setUser({
          id: me.id,
          email: me.email,
          businessName: me.businessName,
          phone: me.phone,
          address: me.address,
          createdAt: me.createdAt,
        });
      } catch {
        api.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener(AUTH_TOKEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(AUTH_TOKEN_EVENT, handler as EventListener);
  }, []);

  // On mount, try to load user from existing token
  useEffect(() => {
    const init = async () => {
      try {
        const me = await api.getMe();
        setUser({
          id: me.id,
          email: me.email,
          businessName: me.businessName,
          phone: me.phone,
          address: me.address,
          createdAt: me.createdAt,
        });
      } catch (error) {
        // If fetching the current user fails, clear any token and continue unauthenticated
        api.logout();
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await api.login(email, password);
      setUser({
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, businessName?: string) => {
    try {
      const { user } = await api.signup(email, password, businessName);
      setUser({
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    api.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}