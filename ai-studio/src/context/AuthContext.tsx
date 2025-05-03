import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if we have an API key in localStorage
  useEffect(() => {
    const checkAuth = async () => {
      const apiKey = localStorage.getItem('apiKey');
      if (apiKey) {
        try {
          // In a real app, we would validate the API key with the server
          // For now, we'll just set a dummy user
          setUser({
            id: '1',
            name: 'Test User',
            email: 'user@example.com',
          });
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error validating API key:', error);
          localStorage.removeItem('apiKey');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (apiKey: string) => {
    try {
      setLoading(true);
      // In a real app, we would validate the API key with the server
      // For now, we'll just store the key and set a dummy user
      localStorage.setItem('apiKey', apiKey);
      setUser({
        id: '1',
        name: 'Test User',
        email: 'user@example.com',
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('apiKey');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};