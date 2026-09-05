import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  sessionError: string | null;
  retrySession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string, businessName?: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const generation = useRef(0);
  const queries = useQueryClient();
  const retrySession = useCallback(async () => {
    const revision = ++generation.current;
    const token = api.getToken();
    setSessionError(null);
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    try {
      const me = await api.getMe();
      if (revision === generation.current && api.getToken() === token) setUser(me);
    } catch {
      if (revision === generation.current && api.getToken() === token) setSessionError('Unable to reach the server. Your session is saved. Try again when your connection returns.');
    } finally { if (revision === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ token: string | null; user?: AuthUser }>).detail;
      ++generation.current;
      queries.clear();
      setSessionError(null);
      if (!detail.token) { setUser(null); setLoading(false); }
      else if (detail.user) { setUser(detail.user); setLoading(false); }
      else { setUser(null); void retrySession(); }
    };
    window.addEventListener(AUTH_TOKEN_EVENT, handler);
    void retrySession();
    return () => { ++generation.current; window.removeEventListener(AUTH_TOKEN_EVENT, handler); };
  }, [retrySession, queries]);
  const signIn = async (email: string, password: string) => {
    try { await api.login(email.trim().toLowerCase(), password); return { error: null }; }
    catch (error) { return { error }; }
  };
  const signUp = async (email: string, password: string, businessName?: string) => {
    try { await api.signup(email, password, businessName); return { error: null }; }
    catch (error) { return { error }; }
  };
  const signOut = async () => { ++generation.current; api.logout(); queries.clear(); setUser(null); setSessionError(null); setLoading(false); };
  return <AuthContext.Provider value={{ user, loading, sessionError, retrySession, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
