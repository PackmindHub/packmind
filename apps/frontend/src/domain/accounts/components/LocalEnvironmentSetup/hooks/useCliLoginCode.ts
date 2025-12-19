import { useEffect, useCallback } from 'react';
import { useCreateCliLoginCodeMutation } from '../../../api/queries/AuthQueries';

export const useCliLoginCode = () => {
  const mutation = useCreateCliLoginCodeMutation();

  useEffect(() => {
    if (!mutation.data && !mutation.isPending) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = useCallback(() => {
    mutation.mutate();
  }, [mutation]);

  return {
    loginCode: mutation.data?.code || null,
    codeExpiresAt: mutation.data?.expiresAt,
    isGenerating: mutation.isPending,
    regenerate,
  };
};
