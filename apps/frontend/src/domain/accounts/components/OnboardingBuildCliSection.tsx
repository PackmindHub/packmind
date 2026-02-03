import {
  PMVStack,
  PMHStack,
  PMHeading,
  PMText,
  PMCard,
  PMBox,
  PMTabs,
  PMCopiable,
  PMIconButton,
  PMBadge,
} from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';
import { useCliLoginCode } from './LocalEnvironmentSetup/hooks/useCliLoginCode';
import {
  buildCurlInstallCommand,
  NPM_INSTALL_COMMAND,
  buildCliLoginCommand,
} from './LocalEnvironmentSetup/utils';

export function OnboardingBuildCliSection() {
  const { loginCode } = useCliLoginCode();
  const curlCommand = buildCurlInstallCommand(loginCode ?? '');
  const loginCommand = buildCliLoginCommand();

  return (
    <PMCard.Root
      flex={1}
      borderWidth="1px"
      borderColor="border.secondary"
      data-testid="OnboardingBuild.CLICard"
    >
      <PMCard.Body padding={6}>
        <PMVStack gap={6} align="stretch">
          <PMVStack gap={2} align="start">
            <PMHeading level="h3">With CLI</PMHeading>
            <PMText color="secondary" fontSize="sm">
              Your agent use command lines to start the analysis and create
              playbook artifacts in Packmind
            </PMText>
          </PMVStack>

          {/* Install section with tabs */}
          <PMVStack gap={2} align="stretch">
            <PMText fontWeight="semibold">Install</PMText>
            <PMTabs
              defaultValue="script"
              tabs={[
                {
                  value: 'script',
                  triggerLabel: 'Script',
                  content: (
                    <PMBox
                      bg="background.secondary"
                      borderRadius="md"
                      padding={4}
                      minHeight="80px"
                      data-testid="OnboardingBuild.InstallScriptContent"
                    >
                      <PMCopiable.Root value={curlCommand}>
                        <PMBox
                          position="relative"
                          _hover={{ '& .copy-button': { opacity: 1 } }}
                        >
                          <PMBox
                            as="pre"
                            fontSize="xs"
                            whiteSpace="pre-wrap"
                            wordBreak="break-all"
                            fontFamily="mono"
                          >
                            {curlCommand}
                          </PMBox>
                          <PMCopiable.Trigger asChild>
                            <PMIconButton
                              className="copy-button"
                              aria-label="Copy to clipboard"
                              variant="surface"
                              size="xs"
                              position="absolute"
                              top={0}
                              right={0}
                              opacity={0}
                              transition="opacity 0.2s"
                              zIndex={1}
                            >
                              <PMCopiable.Indicator>
                                <LuCopy />
                              </PMCopiable.Indicator>
                            </PMIconButton>
                          </PMCopiable.Trigger>
                        </PMBox>
                      </PMCopiable.Root>
                    </PMBox>
                  ),
                },
                {
                  value: 'npm',
                  triggerLabel: 'NPM',
                  content: (
                    <PMBox
                      bg="background.secondary"
                      borderRadius="md"
                      padding={4}
                      minHeight="80px"
                      data-testid="OnboardingBuild.InstallNPMContent"
                    >
                      <PMVStack gap={3} align="stretch">
                        <PMCopiable.Root value={NPM_INSTALL_COMMAND}>
                          <PMBox
                            position="relative"
                            _hover={{ '& .copy-button': { opacity: 1 } }}
                          >
                            <PMBox
                              as="pre"
                              fontSize="xs"
                              whiteSpace="pre-wrap"
                              wordBreak="break-all"
                              fontFamily="mono"
                            >
                              {NPM_INSTALL_COMMAND}
                            </PMBox>
                            <PMCopiable.Trigger asChild>
                              <PMIconButton
                                className="copy-button"
                                aria-label="Copy to clipboard"
                                variant="surface"
                                size="xs"
                                position="absolute"
                                top={0}
                                right={0}
                                opacity={0}
                                transition="opacity 0.2s"
                                zIndex={1}
                              >
                                <PMCopiable.Indicator>
                                  <LuCopy />
                                </PMCopiable.Indicator>
                              </PMIconButton>
                            </PMCopiable.Trigger>
                          </PMBox>
                        </PMCopiable.Root>
                        <PMCopiable.Root value={loginCommand}>
                          <PMBox
                            position="relative"
                            _hover={{ '& .copy-button': { opacity: 1 } }}
                          >
                            <PMBox
                              as="pre"
                              fontSize="xs"
                              whiteSpace="pre-wrap"
                              wordBreak="break-all"
                              fontFamily="mono"
                            >
                              {loginCommand}
                            </PMBox>
                            <PMCopiable.Trigger asChild>
                              <PMIconButton
                                className="copy-button"
                                aria-label="Copy to clipboard"
                                variant="surface"
                                size="xs"
                                position="absolute"
                                top={0}
                                right={0}
                                opacity={0}
                                transition="opacity 0.2s"
                                zIndex={1}
                              >
                                <PMCopiable.Indicator>
                                  <LuCopy />
                                </PMCopiable.Indicator>
                              </PMIconButton>
                            </PMCopiable.Trigger>
                          </PMBox>
                        </PMCopiable.Root>
                      </PMVStack>
                    </PMBox>
                  ),
                },
              ]}
              data-testid="OnboardingBuild.InstallTabs"
            />
          </PMVStack>

          {/* Initialize section */}
          <PMVStack gap={2} align="stretch">
            <PMVStack gap={0} align="start">
              <PMText fontWeight="semibold">Initialize</PMText>
              <PMText color="secondary" fontSize="xs">
                Add Packmind base artifacts to your codebase for artifacts
                creation
              </PMText>
            </PMVStack>
            <PMBox
              bg="background.secondary"
              borderRadius="md"
              padding={4}
              minHeight="40px"
              data-testid="OnboardingBuild.InitializeContent"
            >
              <PMCopiable.Root value="packmind-cli init">
                <PMBox
                  position="relative"
                  _hover={{ '& .copy-button': { opacity: 1 } }}
                >
                  <PMBox
                    as="pre"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    wordBreak="break-all"
                    fontFamily="mono"
                  >
                    packmind-cli init
                  </PMBox>
                  <PMCopiable.Trigger asChild>
                    <PMIconButton
                      className="copy-button"
                      aria-label="Copy to clipboard"
                      variant="surface"
                      size="xs"
                      position="absolute"
                      top={0}
                      right={0}
                      opacity={0}
                      transition="opacity 0.2s"
                      zIndex={1}
                    >
                      <PMCopiable.Indicator>
                        <LuCopy />
                      </PMCopiable.Indicator>
                    </PMIconButton>
                  </PMCopiable.Trigger>
                </PMBox>
              </PMCopiable.Root>
            </PMBox>
          </PMVStack>

          {/* Start analysis section */}
          <PMVStack gap={2} align="stretch">
            <PMVStack gap={0} align="start">
              <PMText fontWeight="semibold">Start analysis</PMText>
              <PMText color="secondary" fontSize="xs">
                Run the onboarding command with your agent
              </PMText>
            </PMVStack>
            <PMBox
              bg="background.secondary"
              borderRadius="md"
              padding={4}
              minHeight="40px"
              data-testid="OnboardingBuild.StartAnalysisContent"
            >
              <PMHStack gap={1} align="center">
                <PMCopiable.Root value="/packmind-onboarding">
                  <PMBox
                    position="relative"
                    _hover={{ '& .copy-button': { opacity: 1 } }}
                  >
                    <PMBox
                      as="pre"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                      wordBreak="break-all"
                      fontFamily="mono"
                    >
                      /packmind-onboarding
                    </PMBox>
                    <PMCopiable.Trigger asChild>
                      <PMIconButton
                        className="copy-button"
                        aria-label="Copy to clipboard"
                        variant="surface"
                        size="xs"
                        position="absolute"
                        top={0}
                        right={0}
                        opacity={0}
                        transition="opacity 0.2s"
                        zIndex={1}
                      >
                        <PMCopiable.Indicator>
                          <LuCopy />
                        </PMCopiable.Indicator>
                      </PMIconButton>
                    </PMCopiable.Trigger>
                  </PMBox>
                </PMCopiable.Root>
              </PMHStack>
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
}
