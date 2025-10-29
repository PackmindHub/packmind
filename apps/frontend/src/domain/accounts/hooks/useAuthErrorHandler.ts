import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from './useAuthContext';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

/**
 * Hook to handle authentication errors (401) by redirecting to sign-in.
 * Must be used within a Router context (i.e., in route components).
 *
 * Uses AuthService indirectly through useAuthContext for auth state,
 * and handles error-based redirects in React components.
 */
export const useAuthErrorHandler = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { error } = useAuthContext();
  const hasHandledError = useRef(false);

  useEffect(() => {
    if (error && !hasHandledError.current) {
      // Check if the error is a 401 Unauthorized
      if (isPackmindError(error)) {
        const status = error.serverError.status;
        if (status === 401) {
          // Mark as handled to prevent multiple redirects
          hasHandledError.current = true;

          // Clear all queries to prevent redirect loops
          queryClient.clear();

          // Navigate to sign-in page
          navigate('/sign-in', { replace: true });
        }
      }
    }
  }, [error, navigate, queryClient]);
};
