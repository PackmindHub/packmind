import React, { useState } from 'react';
import { PMVStack, PMHStack, PMButton, PMAlert, PMBox } from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../../../shared/components/inputs';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';
import { AuthMethod } from '../types';
import { buildCliLoginCommand, formatExpirationDate } from '../utils';
import { useApiKey } from '../hooks';
import { SectionCard, StepHeader, AuthMethodSelector } from '../components';

const LoginCommandContent: React.FC = () => (
  <SectionCard
    title="Login command"
    description="Opens your browser to complete login. An API key is stored locally (expires after 3 months)."
  >
    <PMBox width="1/2">
      <CopiableTextField
        value={buildCliLoginCommand()}
        readOnly
        label="Terminal"
      />
    </PMBox>
  </SectionCard>
);

const ApiKeyContent: React.FC = () => {
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
  } = useApiKey();

  return (
    <SectionCard
      title="API key"
      description="Generate an API key to use as an environment variable. It will expire after 3 months."
    >
      {hasExistingKey && (
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Title>Active API Key</PMAlert.Title>
          <PMAlert.Description>
            You have an active API key that expires on{' '}
            {formatExpirationDate(existingKeyExpiresAt)}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {showConfirmGenerate ? (
        <PMVStack gap={3}>
          <PMAlert.Root status="warning">
            <PMAlert.Indicator />
            <PMAlert.Title>Replace Existing API Key?</PMAlert.Title>
            <PMAlert.Description>
              This will invalidate your current API key. Any applications using
              the old key will need to be updated.
            </PMAlert.Description>
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
          data-testid={CliAuthenticationDataTestIds.GenerateApiKeyCTA}
        >
          {getGenerateButtonLabel()}
        </PMButton>
      )}

      {isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Error Generating API Key</PMAlert.Title>
          <PMAlert.Description>
            {error instanceof Error
              ? error.message
              : 'Failed to generate API key. Please try again.'}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {isSuccess && generatedKey && (
        <PMVStack width="full" gap={3} alignItems="stretch">
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Title>API Key Generated Successfully!</PMAlert.Title>
            <PMAlert.Description>
              Copy this key now - it won't be shown again. Expires on{' '}
              {formatExpirationDate(generatedKeyExpiresAt)}
            </PMAlert.Description>
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
    </SectionCard>
  );
};

export const AuthenticateStep: React.FC = () => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('login-command');

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <StepHeader
        title="Authenticate with Packmind"
        description="Choose how you want to authenticate."
      />

      <AuthMethodSelector value={authMethod} onChange={setAuthMethod} />

      {authMethod === 'login-command' ? (
        <LoginCommandContent />
      ) : (
        <ApiKeyContent />
      )}
    </PMVStack>
  );
};
