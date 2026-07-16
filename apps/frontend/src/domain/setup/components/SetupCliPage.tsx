import React, { useEffect, useState } from 'react';
import {
  PMPage,
  PMPageSection,
  PMVStack,
  PMHStack,
  PMButton,
  PMText,
  PMBox,
  PMAlert,
  PMLink,
} from '@packmind/ui';
import { useLocation, useParams } from 'react-router';
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
  HOMEBREW_INSTALL_COMMAND,
} from '../../accounts/components/LocalEnvironmentSetup/utils';
import {
  SectionCard,
  OsRadioSelector,
  AuthMethodSelector,
  ApiKeyGenerator,
} from '../../accounts/components/LocalEnvironmentSetup/components';
import {
  OsType,
  AuthMethod,
} from '../../accounts/components/LocalEnvironmentSetup/types';
import { routes } from '../../../shared/utils/routes';
import { API_KEY_HASH } from './AutomateUpdatesStep';

const AUTHENTICATE_ANCHOR_ID = 'setup-cli-authenticate';

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
  const { orgSlug } = useParams();
  const apiKey = useApiKey();
  const hasActiveApiKey =
    apiKey.hasExistingKey || (apiKey.isSuccess && Boolean(apiKey.generatedKey));

  return (
    <PMVStack align="stretch" gap={4} width="full">
      <SectionCard
        title="API key"
        description="Generate an API key and set it as the PACKMIND_API_KEY environment variable. It will expire after 3 months."
      >
        <ApiKeyGenerator apiKey={apiKey} />
      </SectionCard>
      {hasActiveApiKey && orgSlug && (
        <SectionCard
          title="Your CLI is ready"
          description="Want it to run automatically? Schedule packmind-cli install on your CI to keep artifacts fresh without manual effort."
          variant="primary"
        >
          <PMLink href={routes.org.toSetupAutoUpdate(orgSlug)}>
            Set up Auto-update →
          </PMLink>
        </SectionCard>
      )}
    </PMVStack>
  );
};

export const SetupCliPage: React.FC = () => {
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);
  const { hash } = useLocation();
  const { orgSlug } = useParams();
  const requestedApiKeyTab = hash === `#${API_KEY_HASH}`;
  const [authMethod, setAuthMethod] = useState<AuthMethod>(() =>
    requestedApiKeyTab ? 'api-key' : 'login-command',
  );
  const { loginCode, isGenerating, codeExpiresAt, regenerate } =
    useCliLoginCode();

  useEffect(() => {
    if (!requestedApiKeyTab) return;
    setAuthMethod('api-key');
    document
      .getElementById(AUTHENTICATE_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [requestedApiKeyTab]);

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
          rows={4}
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
                  <PMBox width="full">{renderGuidedInstallContent()}</PMBox>
                </SectionCard>
              )}

              <PMHStack gap={4} width="full" alignItems="stretch">
                {selectedOs === 'macos-linux' && (
                  <PMBox flex={1}>
                    <SectionCard title="Alternative: Homebrew">
                      <CopiableTextarea
                        value={HOMEBREW_INSTALL_COMMAND}
                        readOnly
                        rows={2}
                      />
                    </SectionCard>
                  </PMBox>
                )}
                <PMBox flex={1}>
                  <SectionCard
                    title={
                      selectedOs === 'macos-linux'
                        ? 'Alternative: NPM'
                        : 'Recommended: NPM'
                    }
                  >
                    <CopiableTextarea
                      value={buildNpmInstallCommand()}
                      readOnly
                      rows={1}
                    />
                    <PMAlert.Root status="info">
                      <PMAlert.Indicator />
                      <PMAlert.Content>
                        <PMAlert.Description>
                          Requires Node.js 22 or higher.
                        </PMAlert.Description>
                      </PMAlert.Content>
                    </PMAlert.Root>
                  </SectionCard>
                </PMBox>
              </PMHStack>
            </PMVStack>
          </PMVStack>
        </PMPageSection>

        {/* Step 2: Authenticate */}
        <PMPageSection
          title="Authenticate"
          variant="outline"
          backgroundColor="primary"
          boxProps={{ width: 'full', id: AUTHENTICATE_ANCHOR_ID }}
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

        <PMText variant="small" color="tertiary">
          Want to run <code>packmind-cli install</code> on a schedule?{' '}
          <PMLink href={orgSlug ? routes.org.toSetupAutoUpdate(orgSlug) : '#'}>
            Set up Auto-update →
          </PMLink>
        </PMText>
      </PMVStack>
    </PMPage>
  );
};
