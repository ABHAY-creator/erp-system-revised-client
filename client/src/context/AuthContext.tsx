import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'SALESPERSON' | 'SALES_MANAGER' | 'HOD';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isSalesperson: boolean;
  isManager: boolean;
  isHOD: boolean;
  canConfirmQuotation: boolean;
  canManageProducts: boolean;
  canDeleteProduct: boolean;
  canAccessReports: boolean;
  canAccessAI: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('erp_token', newToken);
    localStorage.setItem('erp_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
  };

  const role = user?.role;
  const isSalesperson = role === 'SALESPERSON';
  const isManager = role === 'SALES_MANAGER';
  const isHOD = role === 'HOD';

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isSalesperson,
    isManager,
    isHOD,
    canConfirmQuotation: isManager || isHOD,
    canManageProducts: isManager || isHOD,
    canDeleteProduct: isHOD,
    canAccessReports: isManager || isHOD,
    canAccessAI: isHOD,
    canManageUsers: isHOD,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
