import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  /** Initial session check only; keeps the app shell mounted during auth actions. */
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  requestEmailCode: (email: string) => Promise<void>;
  signInWithEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function requestSession(path: string, body?: Record<string, string>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Authentication request failed.');
  return result;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    requestSession('session')
      .then(({ user }) => { if (mounted) setCurrentUser(user || null); })
      .catch(() => { if (mounted) setCurrentUser(null); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const requestEmailCode = async (email: string) => {
    setIsBusy(true);
    setError(null);
    try {
      await requestSession('request-code', { email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a sign-in code.');
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const signInWithEmailCode = async (email: string, code: string) => {
    setIsBusy(true);
    setError(null);
    try {
      const { user } = await requestSession('verify-code', { email, code });
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await requestSession('logout', {});
    } finally {
      setCurrentUser(null);
      setIsLoading(false);
    }
  };

  const currentRole = currentUser?.role || 'customer';
  const value = useMemo(() => ({
    currentUser,
    currentRole,
    isLoading,
    isBusy,
    error,
    requestEmailCode,
    signInWithEmailCode,
    signOut,
    clearError: () => setError(null),
    isAdmin: currentRole === 'admin',
    isManager: currentRole === 'admin' || currentRole === 'manager',
    isCustomer: currentRole === 'customer',
  }), [currentUser, currentRole, isLoading, isBusy, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
