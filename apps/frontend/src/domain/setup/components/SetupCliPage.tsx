import React, { useState } from 'react';
import {
  PMPage,
  PMPageSection,
  PMVStack,
  PMHStack,
  PMButton,
  PMText,
  PMBox,
  PMAlert,
} from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../shared/components/inputs';
import { useCliLoginCode } from '../../accounts/components/LocalEnvironmentSetup/hooks/useCliLoginCode';
import { useApiKey } from '../../accounts/components/LocalEnvironmentSetup/hooks/useApiKey';
import {
  detectUserOs,
  buildNpmInstallCommand,
  buildCurlInstallCommand,
  formatCodeExpiresAt,
  buildCliLoginCommand,
  formatExpirationDate,
} from '../../accounts/components/LocalEnvironmentSetup/utils';
import {
  SectionCard,
  OsRadioSelector,
  AuthMethodSelector,
} from '../../accounts/components/LocalEnvironmentSetup/components';
import {
  OsType,
  AuthMethod,
} from '../../accounts/components/LocalEnvironmentSetup/types';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';

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

export const SetupCliPage: React.FC = () => {
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('login-command');
  const { loginCode, isGenerating, codeExpiresAt, regenerate } =
    useCliLoginCode();

  const renderGuidedInstallContent = () => {
    if (isGenerating) {
      return (
        <PMText as="p" color="tertiary">
          Generating install command...
        </PMText>
      );
    }

    if (!loginCode) return null;

    return (
      <>
        <PMText
          variant="small"
          color="primary"
          as="p"
          style={{
            fontWeight: 'medium',
            marginBottom: '4px',
            display: 'inline-block',
          }}
        >
          Terminal
        </PMText>
        <CopiableTextarea
          value={buildCurlInstallCommand(loginCode)}
          readOnly
          rows={3}
        />
        <PMHStack gap={2} marginTop={2}>
          <PMText variant="small" color="tertiary">
            {formatCodeExpiresAt(codeExpiresAt)}
          </PMText>
          <PMButton variant="tertiary" size="xs" onClick={regenerate}>
            Regenerate code
          </PMButton>
        </PMHStack>
      </>
    );
  };

  return (
    <PMPage
      title="CLI Setup"
      subtitle="Install and authenticate the Packmind CLI to enable local development integration."
    >
      <PMVStack gap={6} width="full">
        {/* Step 1: Install CLI */}
        <PMPageSection
          title="Install"
          backgroundColor="primary"
          boxProps={{ width: 'full' }}
        >
          <PMVStack align="flex-start" gap={4} width="full">
            <PMText color="tertiary" mb={2}>
              Install the CLI using the method that works best for your
              operating system and environment.
            </PMText>

            <PMVStack align="flex-start" gap={2} width="full">
              <OsRadioSelector value={selectedOs} onChange={setSelectedOs} />
            </PMVStack>

            <PMVStack alignItems="flex-start" width="full">
              {selectedOs === 'macos-linux' && (
                <SectionCard
                  title="Guided install"
                  description="One-line install script (installs the CLI and continues automatically)."
                  variant="primary"
                >
                  <PMBox width="1/2">{renderGuidedInstallContent()}</PMBox>
                </SectionCard>
              )}

              <SectionCard
                title={
                  selectedOs === 'macos-linux' ? 'Alternative' : 'Recommended'
                }
                description="Install via npm (most reliable across environments)."
              >
                <PMAlert.Root status="info">
                  <PMAlert.Indicator />
                  <PMAlert.Content>
                    <PMAlert.Description>
                      Requires Node.js 22 or higher.
                    </PMAlert.Description>
                  </PMAlert.Content>
                </PMAlert.Root>
                <PMBox width="1/2">
                  <CopiableTextField
                    value={buildNpmInstallCommand()}
                    readOnly
                    label="Terminal (NPM)"
                  />
                </PMBox>
              </SectionCard>
            </PMVStack>
          </PMVStack>
        </PMPageSection>

        {/* Step 2: Authenticate */}
        <PMPageSection
          title="Authenticate"
          variant="outline"
          backgroundColor="primary"
          boxProps={{ width: 'full' }}
        >
          <PMVStack align="flex-start" gap={4} width="full">
            <PMText color="tertiary" mb={2}>
              Choose how you want to authenticate your CLI.
            </PMText>

            <AuthMethodSelector value={authMethod} onChange={setAuthMethod} />

            {authMethod === 'login-command' ? (
              <LoginCommandContent />
            ) : (
              <ApiKeyContent />
            )}
          </PMVStack>
        </PMPageSection>
      </PMVStack>
    </PMPage>
  );
};
