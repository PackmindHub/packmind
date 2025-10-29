import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../services/auth/AuthService';

interface AuthContextValue {
  authService: AuthService;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Initializes and provides the AuthService singleton
 *
 * This provider should be placed after QueryProvider in the component tree
 * as it depends on the QueryClient to initialize the AuthService.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  // Initialize the singleton with queryClient on first render
  const [authService] = useState(() => {
    const service = AuthService.getInstance();
    service.initialize(queryClient);
    return service;
  });

  return (
    <AuthContext.Provider value={{ authService }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the AuthService instance from React components
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuthService(): AuthService {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthService must be used within AuthProvider');
  }
  return context.authService;
}
