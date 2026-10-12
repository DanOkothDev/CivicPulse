import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { DEMO_USERS } from '../services/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has an existing saved session
    const savedToken = localStorage.getItem('civicpulse_token');
    const savedUser = localStorage.getItem('civicpulse_current_user');

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore corrupted json
        }
      }

      // Verify the saved token against the backend
      api.auth
        .getCurrentUser()
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem('civicpulse_current_user', JSON.stringify(freshUser));
        })
        .catch((err) => {
          if (err.status === 401) {
            // Token expired or invalid
            api.auth.logout();
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Unauthenticated visitor by default
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.auth.register(userData);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setToken(null);
    setUser(null);
  };

  // Helper for quick testing across roles
  const switchRole = (newRole) => {
    const targetUser = DEMO_USERS.find(u => u.role === newRole) || {
      id: user?.id || 1,
      name: `${newRole.toUpperCase()} User`,
      email: `${newRole}@civicpulse.org`,
      role: newRole,
    };
    setUser(targetUser);
    localStorage.setItem('civicpulse_current_user', JSON.stringify(targetUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'resident',
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
