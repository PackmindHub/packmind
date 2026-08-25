import React, { useState, useMemo } from 'react';
import {
  PMBox,
  PMLink,
  PMHStack,
  PMVStack,
  PMText,
  PMHeading,
  PMBadge,
  PMIcon,
  PMAccordion,
  PMAlert,
  PMButton,
} from '@packmind/ui';
import { LuTerminal, LuFileCode, LuFolderSync } from 'react-icons/lu';

import { CopiableTextField, CopiableTextarea } from '../../components/inputs';
import { useCliLoginCode } from '../../../domain/accounts/components/LocalEnvironmentSetup/hooks/useCliLoginCode';
import {
  OsRadioSelector,
  SectionCard,
} from '../../../domain/accounts/components/LocalEnvironmentSetup/components';
import {
  buildCurlInstallCommand,
  formatCodeExpiresAt,
  detectUserOs,
  NPM_INSTALL_COMMAND,
  HOMEBREW_INSTALL_COMMAND,
} from '../../../domain/accounts/components/LocalEnvironmentSetup/utils';
import type { OsType } from '../../../domain/accounts/components/LocalEnvironmentSetup/types';

type ArtifactType = 'standard' | 'command';

interface CreateFromCodeContentProps {
  artifactType: ArtifactType;
}

const ARTIFACT_CONFIG = {
  standard: {
    intro:
      'Standards are reusable coding guidelines that AI coding assistants use to ensure consistency across your codebase.',
    createTitle: 'Create a standard',
    slashCommand: '/packmind-create-standard',
    cliDescription: 'The CLI is required to create and manage standards.',
    guidanceText:
      'Your agent will guide you through the creation process by asking about the topic of the standard you want to create.',
  },
  command: {
    intro:
      'Commands are reusable prompts that help you speed up recurring dev tasks with consistent results across your team.',
    createTitle: 'Create a command',
    slashCommand: '/packmind-create-command',
    cliDescription: 'The CLI is required to create and manage commands.',
    guidanceText:
      'Your agent will guide you through the creation process by asking about the topic of the command you want to create.',
  },
} as const;

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

export const CreateFromCodeContent: React.FC<CreateFromCodeContentProps> = ({
  artifactType,
}) => {
  const config = ARTIFACT_CONFIG[artifactType];
  const { loginCode, codeExpiresAt, isGenerating, isError, regenerate } =
    useCliLoginCode();
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);

  const installCommand = useMemo(
    () => (loginCode ? buildCurlInstallCommand(loginCode) : ''),
    [loginCode],
  );

  const codeExpiration = useMemo(
    () => formatCodeExpiresAt(codeExpiresAt),
    [codeExpiresAt],
  );

  return (
    <PMVStack gap={8} align="stretch">
      <PMBox>
        <PMText color="tertiary">{config.intro}</PMText>
      </PMBox>

      <PMAccordion.Root collapsible>
        {/* Step 1: Install CLI */}
        <PMAccordion.Item
          value="step-1"
          backgroundColor="background.primary"
          p={2}
          border="solid 1px"
          borderColor="border.tertiary"
          borderRadius="md"
          _open={{ borderColor: 'blue.500' }}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <AccordionItemHeader
              stepNumber={1}
              icon={LuTerminal}
              title="Install the Packmind CLI"
              description={config.cliDescription}
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <OsRadioSelector value={selectedOs} onChange={setSelectedOs} />

              {selectedOs === 'macos-linux' ? (
                <>
                  <SectionCard
                    title="Guided install"
                    description="One-line install script (installs the CLI and logs you in automatically)."
                    variant="primary"
                  >
                    <PMBox width="full">
                      {isGenerating ? (
                        <PMText as="p" color="tertiary">
                          Generating install command...
                        </PMText>
                      ) : isError ? (
                        <PMVStack gap={3} align="flex-start">
                          <PMAlert.Root status="error">
                            <PMAlert.Indicator />
                            <PMAlert.Content>
                              <PMAlert.Description>
                                Failed to generate install command. Please try
                                again.
                              </PMAlert.Description>
                            </PMAlert.Content>
                          </PMAlert.Root>
                          <PMButton
                            variant="tertiary"
                            size="xs"
                            onClick={regenerate}
                          >
                            Retry
                          </PMButton>
                        </PMVStack>
                      ) : (
                        loginCode && (
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
                                onClick={regenerate}
                              >
                                Regenerate code
                              </PMButton>
                            </PMHStack>
                          </>
                        )
                      )}
                    </PMBox>
                  </SectionCard>

                  <SectionCard
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
                  </SectionCard>
                </>
              ) : (
                <SectionCard title="Recommended: NPM" variant="primary">
                  <CopiableTextarea
                    value={NPM_INSTALL_COMMAND}
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

        {/* Step 2: Initialize CLI in repo */}
        <PMAccordion.Item
          value="step-2"
          backgroundColor="background.primary"
          mt={4}
          p={2}
          border="solid 1px"
          borderColor="border.tertiary"
          borderRadius="md"
          _open={{ borderColor: 'blue.500' }}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <AccordionItemHeader
              stepNumber={2}
              icon={LuFolderSync}
              title="Initialize CLI in your repo"
              description="Bootstrap Packmind in your repo (first time only)"
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMText as="p" color="secondary">
                Run this command in the root of your repository to set up
                Packmind.
              </PMText>
              <PMBox width="1/2">
                <CopiableTextField
                  value="packmind init"
                  readOnly
                  label="Terminal"
                />
              </PMBox>
              <PMAlert.Root status="info">
                <PMAlert.Indicator />
                <PMAlert.Content>
                  <PMAlert.Description>
                    Only needed the first time you set up the Packmind CLI in a
                    repository. Skip this step if you've already initialized.
                  </PMAlert.Description>
                </PMAlert.Content>
              </PMAlert.Root>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        {/* Step 3: Create the artifact */}
        <PMAccordion.Item
          value="step-3"
          backgroundColor="background.primary"
          mt={4}
          p={2}
          border="solid 1px"
          borderColor="border.tertiary"
          borderRadius="md"
          _open={{ borderColor: 'blue.500' }}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <AccordionItemHeader
              stepNumber={3}
              icon={LuFileCode}
              title={config.createTitle}
              description="Ask your agent"
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMText as="p" color="secondary">
                Open your AI coding assistant and run the following command
              </PMText>
              <PMBox width="1/2">
                <CopiableTextField
                  value={config.slashCommand}
                  readOnly
                  label="Agent prompt"
                />
              </PMBox>
              <PMText as="p" color="tertiary" variant="small">
                {config.guidanceText}
              </PMText>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMVStack>
  );
};
