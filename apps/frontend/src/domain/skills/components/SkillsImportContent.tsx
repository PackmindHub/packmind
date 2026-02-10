import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMBox,
  PMLink,
  PMHStack,
  PMVStack,
  PMText,
  PMHeading,
  PMAccordion,
  PMBadge,
  PMButton,
  PMIcon,
  PMRadioCard,
} from '@packmind/ui';
import { LuTerminal, LuUpload } from 'react-icons/lu';

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

interface AccordionItemHeaderProps {
  stepNumber: number;
  icon: typeof LuTerminal;
  title: string;
  description: string;
}

const AccordionItemHeader: React.FC<AccordionItemHeaderProps> = ({
  stepNumber,
  icon,
  title,
  description,
}) => (
  <PMVStack align="flex-start" gap={1} width="full">
    <PMHStack gap={3}>
      <PMBadge size="xs" borderRadius="full" px={3} py={1} fontWeight="bold">
        {stepNumber}
      </PMBadge>
      <PMIcon as={icon} size="lg" color="text.secondary" />
      <PMHeading level="h5">{title}</PMHeading>
    </PMHStack>
    <PMText as="p" color="tertiary" variant="small">
      {description}
    </PMText>
  </PMVStack>
);

export const SkillsImportContent: React.FC = () => {
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
          Import existing skills into your project. You can add skills from your
          own codebase or from external sources.
        </PMText>
      </PMBox>

      <PMAccordion.Root>
        <PMAccordion.Item
          value="step-1"
          backgroundColor="background.primary"
          p={2}
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          borderRadius={'md'}
          _open={{ borderColor: 'blue.500' }}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <AccordionItemHeader
              stepNumber={1}
              icon={LuTerminal}
              title="Install the Packmind CLI"
              description="The CLI is required to import and manage skills."
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
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
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item
          value="step-2"
          backgroundColor="background.primary"
          mt={4}
          p={2}
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          borderRadius={'md'}
          _open={{ borderColor: 'blue.500' }}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <AccordionItemHeader
              stepNumber={2}
              icon={LuUpload}
              title="Import a skill"
              description="Use the CLI command to import a skill:"
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMBox width="1/2">
                <CopiableTextField
                  value="packmind-cli skills add <skill-directory>"
                  readOnly
                  label="Terminal"
                />
              </PMBox>

              <PMText color="secondary">
                Provide the path to the directory containing the skill you want
                to import. The directory should contain a SKILL.md file.
              </PMText>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMVStack>
  );
};
