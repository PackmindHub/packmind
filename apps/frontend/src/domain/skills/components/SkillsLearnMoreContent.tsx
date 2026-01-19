import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMBox,
  PMLink,
  PMHStack,
  PMVStack,
  PMText,
  PMHeading,
  PMTextArea,
  PMField,
  PMRadioCard,
  PMButton,
  PMBadge,
  PMIcon,
} from '@packmind/ui';
import { LuTerminal, LuFileCode } from 'react-icons/lu';

import {
  CopiableTextField,
  CopiableTextarea,
} from '../../../shared/components/inputs';
import { useCreateCliLoginCodeMutation } from '../../accounts/api/queries/AuthQueries';

const CLI_INSTALL_SCRIPT_URL =
  'https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh';
const NPM_INSTALL_COMMAND = 'npm install -g @packmind/cli';
const DEFAULT_HOST = 'https://app.packmind.ai';

const getCurrentHost = (): string => {
  if (globalThis.location !== undefined) {
    return globalThis.location.origin;
  }
  return DEFAULT_HOST;
};

const isDefaultHost = (): boolean => getCurrentHost() === DEFAULT_HOST;

const buildCurlInstallCommand = (loginCode: string): string => {
  const hostExport = isDefaultHost()
    ? ''
    : `export PACKMIND_HOST=${getCurrentHost()}\n`;
  return `export PACKMIND_LOGIN_CODE=${loginCode}\n${hostExport}curl --proto '=https' --tlsv1.2 -sSf ${CLI_INSTALL_SCRIPT_URL} | sh`;
};

const formatCodeExpiresAt = (expiresAt?: string | Date): string => {
  if (!expiresAt) return '';
  try {
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins <= 0) return 'Code expired';
    return `Code expires in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
};

const detectOS = (): 'macos-linux' | 'windows' => {
  if (typeof navigator === 'undefined') return 'macos-linux';
  return navigator.userAgent.toLowerCase().includes('win')
    ? 'windows'
    : 'macos-linux';
};

interface InstallSectionProps {
  title: string;
  description: string;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

const InstallSection: React.FC<InstallSectionProps> = ({
  title,
  description,
  variant,
  children,
}) => (
  <PMVStack
    align="flex-start"
    gap={4}
    width="full"
    border="solid 1px"
    borderColor={variant === 'primary' ? 'blue.700' : 'border.tertiary'}
    padding={4}
    borderRadius={4}
  >
    <PMVStack align="flex-start" gap={1}>
      <PMHeading level="h6">{title}</PMHeading>
      <PMText as="p" color="tertiary" variant="small">
        {description}
      </PMText>
    </PMVStack>
    {children}
  </PMVStack>
);

interface StepCardProps {
  stepNumber: number;
  icon: typeof LuTerminal;
  title: string;
  description: string;
  colorScheme: 'primary' | 'gray';
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({
  stepNumber,
  icon,
  title,
  description,
  colorScheme,
  children,
}) => (
  <PMBox
    p={6}
    borderRadius="lg"
    borderWidth="1px"
    borderColor="gray.700"
    bg="gray.800"
    transition="all 0.2s"
    _hover={{ borderColor: 'primary', shadow: 'md' }}
  >
    <PMHStack mb={3} gap={3}>
      <PMBadge
        size="lg"
        colorScheme={colorScheme}
        borderRadius="full"
        px={3}
        py={1}
        fontWeight="bold"
      >
        {stepNumber}
      </PMBadge>
      <PMIcon as={icon} size="xl" color="text.faded" />
    </PMHStack>
    <PMHeading level="h4" mb={2}>
      {title}
    </PMHeading>
    <PMText as="p" mb={4} color="secondary">
      {description}
    </PMText>
    {children}
  </PMBox>
);

export const SkillsLearnMoreContent: React.FC = () => {
  const loginCodeMutation = useCreateCliLoginCodeMutation();
  const [selectedOs, setSelectedOs] = useState<'macos-linux' | 'windows'>(
    detectOS,
  );

  useEffect(() => {
    if (!loginCodeMutation.data && !loginCodeMutation.isPending) {
      loginCodeMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateCode = useCallback(() => {
    loginCodeMutation.mutate();
  }, [loginCodeMutation]);

  const installCommand = useMemo(
    () =>
      loginCodeMutation.data?.code
        ? buildCurlInstallCommand(loginCodeMutation.data.code)
        : '',
    [loginCodeMutation.data?.code],
  );

  const codeExpiration = useMemo(
    () => formatCodeExpiresAt(loginCodeMutation.data?.expiresAt),
    [loginCodeMutation.data?.expiresAt],
  );

  return (
    <PMVStack gap={8} align="stretch">
      <PMBox>
        <PMText color="tertiary">
          Skills give AI coding assistants structured know-how to handle
          specific types of tasks autonomously. Create them via the CLI to
          define reusable workflows.
        </PMText>
      </PMBox>

      <StepCard
        stepNumber={1}
        icon={LuTerminal}
        title="Install the Packmind CLI"
        description="The CLI is required to create and manage skills."
        colorScheme="primary"
      >
        <PMVStack align="flex-start" gap={4} width="full">
          <PMRadioCard.Root
            size="sm"
            variant="outline"
            value={selectedOs}
            onValueChange={(e) =>
              setSelectedOs(e.value as 'macos-linux' | 'windows')
            }
          >
            <PMRadioCard.Label>Your operating system</PMRadioCard.Label>
            <PMHStack gap={2} alignItems="stretch" justify="center">
              <PMRadioCard.Item value="macos-linux">
                <PMRadioCard.ItemHiddenInput />
                <PMRadioCard.ItemControl>
                  <PMRadioCard.ItemText>macOS / Linux</PMRadioCard.ItemText>
                  <PMRadioCard.ItemIndicator />
                </PMRadioCard.ItemControl>
              </PMRadioCard.Item>
              <PMRadioCard.Item value="windows">
                <PMRadioCard.ItemHiddenInput />
                <PMRadioCard.ItemControl>
                  <PMRadioCard.ItemText>Windows</PMRadioCard.ItemText>
                  <PMRadioCard.ItemIndicator />
                </PMRadioCard.ItemControl>
              </PMRadioCard.Item>
            </PMHStack>
          </PMRadioCard.Root>

          {selectedOs === 'macos-linux' ? (
            <>
              <InstallSection
                title="Guided install"
                description="One-line install script (installs the CLI and continues automatically)."
                variant="primary"
              >
                <PMBox width="full">
                  {loginCodeMutation.isPending ? (
                    <PMText as="p" color="tertiary">
                      Generating install command...
                    </PMText>
                  ) : (
                    loginCodeMutation.data?.code && (
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
                          value={installCommand}
                          readOnly
                          rows={3}
                        />
                        <PMHStack gap={2} marginTop={2}>
                          <PMText variant="small" color="tertiary">
                            {codeExpiration}
                          </PMText>
                          <PMButton
                            variant="tertiary"
                            size="xs"
                            onClick={handleRegenerateCode}
                          >
                            Regenerate code
                          </PMButton>
                        </PMHStack>
                      </>
                    )
                  )}
                </PMBox>
              </InstallSection>

              <InstallSection
                title="Alternative"
                description="Install via npm (most reliable across environments)."
                variant="secondary"
              >
                <PMBox width="1/2">
                  <CopiableTextField
                    value={NPM_INSTALL_COMMAND}
                    readOnly
                    label="Terminal (NPM)"
                  />
                </PMBox>
              </InstallSection>
            </>
          ) : (
            <InstallSection
              title="Recommended"
              description="Install via npm (most reliable across environments)."
              variant="primary"
            >
              <PMBox width="1/2">
                <CopiableTextField
                  value={NPM_INSTALL_COMMAND}
                  readOnly
                  label="Terminal (NPM)"
                />
              </PMBox>
            </InstallSection>
          )}

          <PMText color="secondary" fontSize="sm">
            For more installation methods, see the{' '}
            <PMLink
              href="https://docs.packmind.com/cli#installation"
              target="_blank"
              variant="active"
            >
              CLI documentation
            </PMLink>
            .
          </PMText>
        </PMVStack>
      </StepCard>

      <StepCard
        stepNumber={2}
        icon={LuFileCode}
        title="Create a skill"
        description="Use the CLI command to create a new skill:"
        colorScheme="gray"
      >
        <PMField.Root width="full" mb={4}>
          <PMField.Label>Create a skill with the CLI</PMField.Label>
          <PMTextArea
            value="packmind-cli skill add <path-to-skill-directory>"
            readOnly
            resize={'none'}
          />
        </PMField.Root>

        <PMText color="secondary">
          Target directory must contain a SKILL.md file.
        </PMText>
      </StepCard>
    </PMVStack>
  );
};
