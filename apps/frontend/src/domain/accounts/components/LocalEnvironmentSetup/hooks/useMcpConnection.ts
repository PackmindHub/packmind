import { useEffect, useMemo } from 'react';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../../../api/queries/AuthQueries';

export const useMcpConnection = () => {
  const tokenMutation = useGetMcpTokenMutation();
  const urlQuery = useGetMcpURLQuery();

  useEffect(() => {
    if (!tokenMutation.data && !tokenMutation.isPending) {
      tokenMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessage = useMemo(() => {
    if (!tokenMutation.isError) return null;
    return tokenMutation.error instanceof Error
      ? tokenMutation.error.message
      : 'Failed to retrieve MCP access token';
  }, [tokenMutation.isError, tokenMutation.error]);

  return {
    url: urlQuery.data?.url,
    token: tokenMutation.data?.access_token,
    isLoading: tokenMutation.isPending,
    isReady:
      tokenMutation.isSuccess &&
      !!tokenMutation.data?.access_token &&
      !!urlQuery.data?.url,
    isError: tokenMutation.isError,
    errorMessage,
  };
};
