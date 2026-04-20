import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMBox,
  PMLink,
  PMHStack,
  PMVStack,
  PMText,
  PMHeading,
  PMRadioCard,
  PMButton,
  PMBadge,
  PMIcon,
  PMAccordion,
  PMAlert,
} from '@packmind/ui';
import { LuTerminal, LuSend } from 'react-icons/lu';

import {
  CopiableTextField,
  CopiableTextarea,
} from '../../../shared/components/inputs';
import { useCreateCliLoginCodeMutation } from '../../accounts/api/queries/AuthQueries';
import {
  HOMEBREW_INSTALL_COMMAND,
  NPM_INSTALL_COMMAND,
  buildCurlInstallCommand,
  formatCodeExpiresAt,
  detectUserOs,
} from '../../accounts/components/LocalEnvironmentSetup/utils';

const DIFF_SUBMIT_COMMAND = 'packmind-cli diff --submit';

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

export const ReviewChangesLearnMoreContent: React.FC = () => {
  const loginCodeMutation = useCreateCliLoginCodeMutation();
  const [selectedOs, setSelectedOs] = useState<'macos-linux' | 'windows'>(
    detectUserOs,
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
          The Packmind CLI detects local changes to your standards, commands,
          and skills, then submits them as change proposals for your team to
          review.
        </PMText>
      </PMBox>

      <PMAccordion.Root collapsible>
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
              description="The CLI is required to detect and submit changes."
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
                    description="Other installation methods."
                    variant="secondary"
                  >
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
                      Terminal (Homebrew)
                    </PMText>
                    <CopiableTextarea
                      value={HOMEBREW_INSTALL_COMMAND}
                      readOnly
                      rows={2}
                    />
                    <PMText
                      variant="small"
                      color="primary"
                      as="p"
                      style={{
                        fontWeight: 'medium',
                        marginBottom: '4px',
                        marginTop: '12px',
                        display: 'inline-block',
                      }}
                    >
                      Terminal (NPM)
                    </PMText>
                    <CopiableTextField value={NPM_INSTALL_COMMAND} readOnly />
                    <PMAlert.Root status="info">
                      <PMAlert.Indicator />
                      <PMAlert.Content>
                        <PMAlert.Description>
                          Requires Node.js 22 or higher.
                        </PMAlert.Description>
                      </PMAlert.Content>
                    </PMAlert.Root>
                  </InstallSection>
                </>
              ) : (
                <InstallSection
                  title="Recommended"
                  description="Install via npm (most reliable across environments)."
                  variant="primary"
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
                      value={NPM_INSTALL_COMMAND}
                      readOnly
                      label="Terminal (NPM)"
                    />
                  </PMBox>
                </InstallSection>
              )}

              <PMText color="secondary">
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
              icon={LuSend}
              title="Submit changes"
              description="Detect local changes and submit them for review."
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMText as="p" color="secondary">
                Run the following command from your project directory to detect
                differences between your local playbook files and the server,
                then submit them as change proposals.
              </PMText>
              <PMBox width="1/2">
                <CopiableTextField
                  value={DIFF_SUBMIT_COMMAND}
                  readOnly
                  label="Terminal"
                />
              </PMBox>
              <PMAlert.Root status="info">
                <PMAlert.Indicator />
                <PMAlert.Content>
                  <PMAlert.Description>
                    You can also run <strong>packmind-cli diff</strong> without{' '}
                    <strong>--submit</strong> to preview changes before
                    submitting.
                  </PMAlert.Description>
                </PMAlert.Content>
              </PMAlert.Root>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMVStack>
  );
};
