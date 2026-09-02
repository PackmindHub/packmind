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

import type { ArtifactType } from '@packmind/types';

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

/**
 * Which artifact this dialog is teaching, or `all` when it is teaching the
 * route in rather than one type.
 *
 * `all` exists because the three per-type versions of this dialog were the same
 * dialog. Two of them were literally this component with a different noun, and
 * the third was a second copy of the accordion. The Context menu asks "how do I
 * write any of this", which has one answer, so it passes `all` and the steps
 * that never varied are stated once.
 */
export type CreateFromCodeSubject = ArtifactType | 'all';

interface CreateFromCodeContentProps {
  artifactType: CreateFromCodeSubject;
}

/**
 * What changes between types is the prose, and only the prose. The slash
 * command comes from the creation registry instead of being restated here: this
 * file used to carry its own narrower list of types, which would have gone
 * silently out of date the day a fourth one arrived.
 */
const ARTIFACT_COPY: Record<
  ArtifactType,
  { noun: string; nounPlural: string; intro: string }
> = {
  standard: {
    noun: 'standard',
    nounPlural: 'standards',
    intro:
      'Standards are reusable coding guidelines that AI coding assistants use to ensure consistency across your codebase.',
  },
  command: {
    noun: 'command',
    nounPlural: 'commands',
    intro:
      'Commands are reusable prompts that help you speed up recurring dev tasks with consistent results across your team.',
  },
  skill: {
    noun: 'skill',
    nounPlural: 'skills',
    intro:
      'Skills give AI coding assistants structured know-how to handle specific types of tasks autonomously.',
  },
};

/**
 * The skill that writes an artifact, and the only one this dialog names.
 *
 * It does not vary with the type being taught. The dialog used to name
 * `packmind-create-standard`, `-command` and `-skill`, one per type; those were
 * retired and the deployers now delete them from a repository on sight, so it
 * was teaching three commands that a freshly synced repository does not have.
 * One skill covers every kind of artifact.
 *
 * `packmind-onboard` also ships, and is deliberately not here. It drafts a whole
 * starting playbook from the codebase, which is a different job from the one a
 * reader who just pressed Create is doing, and naming it beside this one would
 * put a choice in front of them that only makes sense once they know what both
 * do. It has its own place in onboarding.
 *
 * The description is the wording the Review changes screen already uses for this
 * skill, rather than a second one written here.
 */
const AGENT_SKILL = {
  command: '/packmind-update-playbook',
  description:
    'Submits standards, commands and skills as change proposals for team review.',
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
  const single = artifactType === 'all' ? null : ARTIFACT_COPY[artifactType];

  const intro =
    single?.intro ??
    'Your coding agent reads your repository and writes the playbook from it: standards, commands and skills.';
  const cliDescription = `The CLI is required to create and manage ${single?.nounPlural ?? 'your playbook'}.`;
  const guidanceText = single
    ? `Your agent will guide you through the creation process by asking about the topic of the ${single.noun} you want to create.`
    : 'Your agent will guide you through the creation process by asking what the change should cover.';

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
        <PMText color="tertiary">{intro}</PMText>
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
              description={cliDescription}
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
              title="Set up the repo and its skills"
              description="Which command depends on whether Packmind is already there"
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMText as="p" color="secondary">
                Run one of these in the root of your repository.
              </PMText>
              {/*
                Two commands, as the Review changes screen already shows them.
                This step used to offer `packmind init` alone and call it "first
                time only", which left a reader with an existing repository
                nothing to run. That gap matters more than it used to: the
                per-type creation skills were retired, and `packmind skills
                init` is what replaces them in a repository that already has the
                old ones.
              */}
              <PMBox width="full">
                <CopiableTextField
                  value="packmind init"
                  readOnly
                  label="New repo"
                />
              </PMBox>
              <PMBox width="full">
                <CopiableTextField
                  value="packmind skills init"
                  readOnly
                  label="Existing repo"
                />
              </PMBox>
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
              title={single ? `Create a ${single.noun}` : 'Create an artifact'}
              description="Invoke the skill in your AI coding assistant"
            />
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={6}>
            <PMVStack align="flex-start" gap={4} width="full">
              <PMText as="p" color="secondary">
                Open your AI coding assistant and invoke the following skill
              </PMText>
              {/*
                One skill, whatever type this dialog is teaching. It is not
                scoped to a kind of artifact any more, so naming one per type
                would invent a distinction the CLI does not make.
              */}
              <PMBox width="full">
                <CopiableTextField
                  value={AGENT_SKILL.command}
                  readOnly
                  label="Agent prompt"
                />
              </PMBox>
              <PMText as="p" color="tertiary" variant="small">
                {AGENT_SKILL.description} {guidanceText}
              </PMText>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMVStack>
  );
};
