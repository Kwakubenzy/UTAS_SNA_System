import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import api from '../services/api';
import { tokenStorage } from '../services/tokenStorage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  loginWithGoogle: (credential: string, remember?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = tokenStorage.getAccessToken();
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        tokenStorage.clear();
      }
    } catch {
      tokenStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, remember = true) => {
    try {
      const response = await api.login({ username, password });
      if (response.success && response.user && response.tokens) {
        tokenStorage.setTokens(response.tokens.access_token, response.tokens.refresh_token, remember);
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Login failed. Please try again.');
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.message || 'Invalid username or password.');
      }
      if (error.request) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  };

  const loginWithGoogle = async (credential: string, remember = true) => {
    try {
      const response = await api.loginWithGoogle(credential);
      if (response.success && response.user && response.tokens) {
        tokenStorage.setTokens(response.tokens.access_token, response.tokens.refresh_token, remember);
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Google sign-in failed. Please try again.');
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.message || 'Google sign-in failed.');
      }
      if (error.request) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw new Error(error.message || 'Google sign-in failed. Please try again.');
    }
  };

  const register = async (data: any) => {
    try {
      const response = await api.register(data);
      if (response.success && response.user && response.tokens) {
        tokenStorage.setTokens(response.tokens.access_token, response.tokens.refresh_token, true);
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.updateProfile(data);
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Update failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
