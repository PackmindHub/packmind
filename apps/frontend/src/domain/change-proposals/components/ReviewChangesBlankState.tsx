import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMAccordion,
  PMAlert,
  PMBox,
  PMButton,
  PMGrid,
  PMGridItem,
  PMHeading,
  PMHStack,
  PMIcon,
  PMLink,
  PMRadioCard,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuDownload,
  LuFolderSync,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
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

const DIFF_SUBMIT_COMMAND = `packmind-cli diff --submit -m "<your commit message>"`;

const ARCADE_LOAD_TIMEOUT_MS = 5000;

const ArcadeEmbed = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsTimedOut(true), ARCADE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (isTimedOut && !isLoaded) return null;

  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: 'calc(64.94708994708994% + 41px)',
        height: '0',
        width: '100%',
        visibility: isLoaded ? 'visible' : 'hidden',
      }}
    >
      <iframe
        src="https://demo.arcade.software/wbBeKqYxj18jhRkKMHwo?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
        title="Review and Approve Accessibility Updates in Design System"
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        onLoad={() => setIsLoaded(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          colorScheme: 'light',
        }}
      />
    </div>
  );
};
const SKILL_COMMAND = '/packmind-update-playbook';

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

export const ReviewChangesBlankState = () => {
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
    <PMVStack gap={4} width="full">
      <PMBox
        borderRadius={'md'}
        backgroundColor={'background.primary'}
        p={8}
        border="solid 1px"
        borderColor={'border.tertiary'}
      >
        <PMAlert.Root status="info" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>
              Playbook update management will soon require an Enterprise plan.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMHeading level="h2">Review your team's playbook updates</PMHeading>
        <PMText as="p" fontWeight={'medium'} color="secondary">
          When teammates propose changes to your coding standards, skills, or
          commands, they'll appear here for your team to review and approve
          together.
        </PMText>

        <PMBox mt={8} width="full" maxWidth="640px">
          <ArcadeEmbed />
        </PMBox>

        <PMVStack alignItems={'flex-start'} width={'full'} mt={8} gap={4}>
          <PMHeading level="h3">How to start?</PMHeading>
          <PMAccordion.Root collapsible width="full">
            <PMAccordion.Item
              value="install-cli"
              backgroundColor="background.primary"
              p={2}
              border={'solid 1px'}
              borderColor={'border.tertiary'}
              borderRadius={'md'}
              _open={{ borderColor: 'blue.500' }}
            >
              <PMAccordion.ItemTrigger cursor="pointer">
                <PMAccordion.ItemIndicator />
                <PMVStack align="flex-start" gap={1} width="full">
                  <PMHStack gap={3}>
                    <PMIcon as={LuDownload} size="lg" color="text.secondary" />
                    <PMHeading level="h5">Install the Packmind CLI</PMHeading>
                  </PMHStack>
                  <PMText as="p" color="tertiary" variant="small">
                    Requires CLI &gt;= 0.21.0
                  </PMText>
                </PMVStack>
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
                          <PMRadioCard.ItemText>
                            macOS / Linux
                          </PMRadioCard.ItemText>
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
                        <CopiableTextField
                          value={NPM_INSTALL_COMMAND}
                          readOnly
                        />
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
              value="setup-repo"
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
                <PMVStack align="flex-start" gap={1} width="full">
                  <PMHStack gap={3}>
                    <PMIcon
                      as={LuFolderSync}
                      size="lg"
                      color="text.secondary"
                    />
                    <PMHeading level="h5">Setup repo and skills</PMHeading>
                  </PMHStack>
                  <PMText as="p" color="tertiary" variant="small">
                    Initialize Packmind in your repository to sync your
                    playbook.
                  </PMText>
                </PMVStack>
              </PMAccordion.ItemTrigger>
              <PMAccordion.ItemContent p={6}>
                <PMVStack align="flex-start" gap={4} width="full">
                  <PMBox width="full">
                    <CopiableTextField
                      value="packmind-cli init"
                      readOnly
                      label="New repo"
                    />
                  </PMBox>
                  <PMBox width="full">
                    <CopiableTextField
                      value="packmind-cli skills init"
                      readOnly
                      label="Existing repo"
                    />
                  </PMBox>
                </PMVStack>
              </PMAccordion.ItemContent>
            </PMAccordion.Item>
          </PMAccordion.Root>

          <PMGrid gridTemplateColumns={'1fr 1fr'} gap={4} width={'full'}>
            <PMGridItem>
              <PMBox
                backgroundColor={'background.primary'}
                borderRadius={'md'}
                p={6}
                display={'flex'}
                flexDirection={'column'}
                gap={4}
                alignItems={'flex-start'}
                border={'solid 1px'}
                borderColor={'border.tertiary'}
                height={'full'}
              >
                <PMBox>
                  <PMHStack mb={2}>
                    <PMIcon color={'branding.primary'} size={'lg'}>
                      <LuWandSparkles />
                    </PMIcon>
                    <PMHeading level="h5" fontWeight={'bold'}>
                      Use skill /packmind-update-playbook
                    </PMHeading>
                  </PMHStack>
                  <PMBox fontSize={'sm'} color={'text.secondary'}>
                    Invoke the skill in your AI agent to guide you through
                    submitting artifact updates.
                  </PMBox>
                </PMBox>
                <PMBox width="full">
                  <CopiableTextField
                    value={SKILL_COMMAND}
                    readOnly
                    label="Terminal"
                  />
                </PMBox>
              </PMBox>
            </PMGridItem>
            <PMGridItem>
              <PMBox
                backgroundColor={'background.primary'}
                borderRadius={'md'}
                p={6}
                display={'flex'}
                flexDirection={'column'}
                gap={4}
                alignItems={'flex-start'}
                border={'solid 1px'}
                borderColor={'border.tertiary'}
                height={'full'}
              >
                <PMBox>
                  <PMHStack mb={2}>
                    <PMIcon color={'branding.primary'} size={'lg'}>
                      <LuTerminal />
                    </PMIcon>
                    <PMHeading level="h5" fontWeight={'bold'}>
                      Update manually
                    </PMHeading>
                  </PMHStack>
                  <PMBox fontSize={'sm'} color={'text.secondary'}>
                    Edit your local playbook files (e.g.{' '}
                    <PMText as="span" fontFamily="mono" fontSize="xs">
                      .claude/commands/git-commit.md
                    </PMText>
                    ), then submit changes via CLI.
                  </PMBox>
                </PMBox>
                <PMBox width="full">
                  <CopiableTextField
                    value={DIFF_SUBMIT_COMMAND}
                    readOnly
                    label="Terminal"
                  />
                </PMBox>
              </PMBox>
            </PMGridItem>
          </PMGrid>
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
};
