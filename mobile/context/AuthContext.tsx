import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

import { getToken } from '@/api/tokenStorage';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/api/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkExistingToken() {
      const token = await getToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    }
    checkExistingToken();
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    setIsAuthenticated(true);
  }

  async function register(email: string, password: string) {
    await apiRegister(email, password);
    // Registration doesn't return a token (matches backend design -
    // register returns UserOut, not TokenResponse), so the user still
    // needs to log in separately after registering.
  }

  async function logout() {
    await apiLogout();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, register, logout }}>
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