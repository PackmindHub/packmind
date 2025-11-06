import React, { useState } from 'react';
import {
  PMButton,
  PMPageSection,
  PMText,
  PMVStack,
  PMHStack,
  PMAlert,
  PMField,
} from '@packmind/ui';
import {
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
} from '../api/queries/AuthQueries';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { UserId } from '@packmind/types';

export const ApiKeyConfig: React.FunctionComponent = () => {
  const { user, organization } = useAuthContext();
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const getCurrentApiKeyQuery = useGetCurrentApiKeyQuery({
    userId: user?.id || ('' as UserId),
  });
  const generateApiKeyMutation = useGenerateApiKeyMutation();

  if (!user || !organization) {
    return;
  }

  const handleGenerateApiKey = () => {
    if (getCurrentApiKeyQuery.data?.hasApiKey && !showConfirmGenerate) {
      setShowConfirmGenerate(true);
      return;
    }

    generateApiKeyMutation.mutate({});
    setShowConfirmGenerate(false);
  };

  const handleCancelGenerate = () => {
    setShowConfirmGenerate(false);
  };

  const formatExpirationDate = (expiresAt?: string | Date) => {
    if (!expiresAt) return 'Unknown';
    try {
      const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <PMPageSection title="API Key" variant="outline">
      <PMText as="p">
        Generate an API key for Packmind CLI. It will expires after 3 months.
      </PMText>

      <PMVStack width="100%" alignItems="baseline" gap={4}>
        {/* Current API Key Status */}
        {getCurrentApiKeyQuery.data?.hasApiKey && (
          <PMAlert.Root status="info">
            <PMAlert.Indicator />
            <PMAlert.Title>Active API Key</PMAlert.Title>
            <PMAlert.Description>
              You have an active API key that expires on{' '}
              {formatExpirationDate(getCurrentApiKeyQuery.data.expiresAt)}
            </PMAlert.Description>
          </PMAlert.Root>
        )}

        {/* Generate Button or Confirmation */}
        {showConfirmGenerate ? (
          <PMVStack gap={3}>
            <PMAlert.Root status="warning">
              <PMAlert.Indicator />
              <PMAlert.Title>Replace Existing API Key?</PMAlert.Title>
              <PMAlert.Description>
                This will invalidate your current API key. Any applications
                using the old key will need to be updated.
              </PMAlert.Description>
            </PMAlert.Root>

            <PMHStack gap={2}>
              <PMButton
                onClick={handleGenerateApiKey}
                disabled={generateApiKeyMutation.isPending}
              >
                {generateApiKeyMutation.isPending
                  ? 'Generating...'
                  : 'Yes, Generate New Key'}
              </PMButton>
              <PMButton
                variant="outline"
                onClick={handleCancelGenerate}
                disabled={generateApiKeyMutation.isPending}
              >
                Cancel
              </PMButton>
            </PMHStack>
          </PMVStack>
        ) : (
          <PMButton
            onClick={handleGenerateApiKey}
            disabled={generateApiKeyMutation.isPending}
          >
            {generateApiKeyMutation.isPending
              ? 'Generating...'
              : getCurrentApiKeyQuery.data?.hasApiKey
                ? 'Generate New API Key'
                : 'Generate API Key'}
          </PMButton>
        )}

        {/* Error Display */}
        {generateApiKeyMutation.isError && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>Error Generating API Key</PMAlert.Title>
            <PMAlert.Description>
              {generateApiKeyMutation.error instanceof Error
                ? generateApiKeyMutation.error.message
                : 'Failed to generate API key. Please try again.'}
            </PMAlert.Description>
          </PMAlert.Root>
        )}

        {/* Success Display with API Key */}
        {generateApiKeyMutation.isSuccess && generateApiKeyMutation.data && (
          <PMVStack width="full" gap={3} alignItems={'stretch'}>
            <PMAlert.Root status="success">
              <PMAlert.Indicator />
              <PMAlert.Title>API Key Generated Successfully!</PMAlert.Title>
              <PMAlert.Description>
                Copy this key now - it won't be shown again. Expires on{' '}
                {formatExpirationDate(generateApiKeyMutation.data.expiresAt)}
              </PMAlert.Description>
            </PMAlert.Root>

            <PMField.Root>
              <PMField.Label>Your API Key</PMField.Label>
              <CopiableTextarea
                value={generateApiKeyMutation.data.apiKey}
                readOnly
                rows={4}
                data-testid="generated-api-key"
                width={'full'}
              />
            </PMField.Root>
          </PMVStack>
        )}
      </PMVStack>
    </PMPageSection>
  );
};
