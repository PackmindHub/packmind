import React from 'react';
import { PMVStack, PMHStack, PMButton, PMBox, PMAlert } from '@packmind/ui';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { formatExpirationDate } from '../utils';
import { useApiKey } from '../hooks/useApiKey';

interface IApiKeyGeneratorProps {
  apiKey: ReturnType<typeof useApiKey>;
}

export const ApiKeyGenerator: React.FC<IApiKeyGeneratorProps> = ({
  apiKey,
}) => {
  const {
    hasExistingKey,
    existingKeyExpiresAt,
    generatedKey,
    generatedKeyExpiresAt,
    isGenerating,
    isSuccess,
    isError,
    error,
    showConfirmGenerate,
    handleGenerate,
    cancelGenerate,
    getGenerateButtonLabel,
  } = apiKey;

  return (
    <PMVStack align="stretch" gap={3} width="full">
      {hasExistingKey && (
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Active API Key</PMAlert.Title>
            <PMAlert.Description>
              You have an active API key that expires on{' '}
              {formatExpirationDate(existingKeyExpiresAt)}
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {showConfirmGenerate ? (
        <PMVStack gap={3}>
          <PMAlert.Root status="warning">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Replace Existing API Key?</PMAlert.Title>
              <PMAlert.Description>
                This will invalidate your current API key. Any applications
                using the old key will need to be updated.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>

          <PMHStack gap={2}>
            <PMButton onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Yes, Generate New Key'}
            </PMButton>
            <PMButton
              variant="outline"
              onClick={cancelGenerate}
              disabled={isGenerating}
            >
              Cancel
            </PMButton>
          </PMHStack>
        </PMVStack>
      ) : (
        <PMButton
          onClick={handleGenerate}
          disabled={isGenerating}
          alignSelf="flex-start"
          data-testid={CliAuthenticationDataTestIds.GenerateApiKeyCTA}
        >
          {getGenerateButtonLabel()}
        </PMButton>
      )}

      {isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Error Generating API Key</PMAlert.Title>
            <PMAlert.Description>
              {error instanceof Error
                ? error.message
                : 'Failed to generate API key. Please try again.'}
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {isSuccess && generatedKey && (
        <PMVStack width="full" gap={3} alignItems="stretch">
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>API Key Generated Successfully!</PMAlert.Title>
              <PMAlert.Description>
                Copy this key now - it won't be shown again. Set it as the{' '}
                <code>PACKMIND_API_KEY_V3</code> environment variable. Expires
                on {formatExpirationDate(generatedKeyExpiresAt)}
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>

          <PMBox width="full">
            <CopiableTextarea
              value={generatedKey}
              readOnly
              rows={4}
              data-testid={CliAuthenticationDataTestIds.ApiKeyInput}
            />
          </PMBox>
        </PMVStack>
      )}
    </PMVStack>
  );
};
