import { useState, useCallback } from 'react';
import { UserId } from '@packmind/types';
import { useAuthContext } from '../../../hooks/useAuthContext';
import {
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
} from '../../../api/queries/AuthQueries';

export const useApiKey = () => {
  const { user } = useAuthContext();
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);

  const currentApiKeyQuery = useGetCurrentApiKeyQuery({
    userId: user?.id || ('' as UserId),
  });
  const generateMutation = useGenerateApiKeyMutation();

  const handleGenerate = useCallback(() => {
    if (currentApiKeyQuery.data?.hasApiKey && !showConfirmGenerate) {
      setShowConfirmGenerate(true);
      return;
    }
    generateMutation.mutate({});
    setShowConfirmGenerate(false);
  }, [
    currentApiKeyQuery.data?.hasApiKey,
    showConfirmGenerate,
    generateMutation,
  ]);

  const cancelGenerate = useCallback(() => {
    setShowConfirmGenerate(false);
  }, []);

  const getGenerateButtonLabel = useCallback((): string => {
    if (generateMutation.isPending) return 'Generating...';
    if (currentApiKeyQuery.data?.hasApiKey) return 'Generate New API Key';
    return 'Generate API Key';
  }, [generateMutation.isPending, currentApiKeyQuery.data?.hasApiKey]);

  return {
    hasExistingKey: currentApiKeyQuery.data?.hasApiKey ?? false,
    existingKeyExpiresAt: currentApiKeyQuery.data?.expiresAt,
    generatedKey: generateMutation.data?.apiKey,
    generatedKeyExpiresAt: generateMutation.data?.expiresAt,
    isGenerating: generateMutation.isPending,
    isSuccess: generateMutation.isSuccess,
    isError: generateMutation.isError,
    error: generateMutation.error,
    showConfirmGenerate,
    handleGenerate,
    cancelGenerate,
    getGenerateButtonLabel,
  };
};
