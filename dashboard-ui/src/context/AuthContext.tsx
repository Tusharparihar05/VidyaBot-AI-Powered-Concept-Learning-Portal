import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '../types';

const STORAGE_KEY = 'vidyabot-auth';

export interface AuthSession {
  token: string;
  profile: UserProfile;
}

interface SignUpData {
  username: string;
  email: string;
  password: string;
  institutionType: string;
  institutionName: string;
  gradeYear: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as AuthSession;
  } catch {
    return null;
  }
}

function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearAuthSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function buildProfile(data: {
  email: string;
  username?: string;
  institutionName?: string;
  gradeYear?: string;
}): UserProfile {
  const displayName =
    data.username?.trim() || data.email.split('@')[0] || 'Student';
  const institutionName = data.institutionName?.trim() || '';
  const gradeYear = data.gradeYear?.trim() || '';
  const classLine = [gradeYear, institutionName].filter(Boolean).join(' · ') || '—';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName,
  )}&background=10b981&color=fff`;
  return {
    displayName,
    classLine,
    email: data.email.trim(),
    avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = loadAuthSession();
    if (saved) {
      setSession(saved);
      setUser(saved.profile);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      return { error: 'Enter email and password.' };
    }

    const profile = buildProfile({ email });
    const authSession: AuthSession = {
      token: btoa(`${email}:${Date.now()}`),
      profile,
    };

    saveAuthSession(authSession);
    setSession(authSession);
    setUser(profile);

    return { error: null };
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    if (!data.username.trim()) {
      return { error: 'Please enter a username.' };
    }
    if (!data.email.trim()) {
      return { error: 'Please enter your email.' };
    }
    if (data.password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }
    if (!data.institutionName.trim()) {
      return { error: 'Please enter your school or college name.' };
    }
    if (!data.gradeYear.trim()) {
      return { error: `Please select your ${data.institutionType === 'school' ? 'grade' : 'year'}.` };
    }

    const profile = buildProfile({
      email: data.email,
      username: data.username,
      institutionName: data.institutionName,
      gradeYear: data.gradeYear,
    });

    const authSession: AuthSession = {
      token: btoa(`${data.email}:${Date.now()}`),
      profile,
    };

    saveAuthSession(authSession);
    setSession(authSession);
    setUser(profile);

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    clearAuthSession();
    setSession(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(() => {
    const saved = loadAuthSession();
    if (saved) {
      setSession(saved);
      setUser(saved.profile);
    }
  }, []);

  const profile = useMemo(() => session?.profile ?? null, [session]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
