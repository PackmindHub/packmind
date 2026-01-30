import {
  PMVStack,
  PMHStack,
  PMHeading,
  PMText,
  PMButton,
  PMCard,
  PMBox,
  PMTabs,
  PMIcon,
  PMSpinner,
} from '@packmind/ui';
import { LuCircleHelp } from 'react-icons/lu';

interface OnboardingBuildProps {
  onComplete: () => void;
  onPrevious: () => void;
}

export function OnboardingBuild({
  onComplete,
  onPrevious,
}: OnboardingBuildProps) {
  return (
    <PMVStack
      align="stretch"
      width="full"
      height="full"
      justify="space-between"
    >
      {/* Header */}
      <PMVStack gap={2} align="start">
        <PMHeading level="h2">Build my playbook</PMHeading>
        <PMText color="secondary" fontSize="md">
          Analyze your local repository to generate an initial Playbook, based
          on the patterns your team already uses.
        </PMText>
      </PMVStack>

      {/* Two-column content */}
      <PMHStack gap={8} align="stretch" flex={1} paddingY={6}>
        {/* Left Column - With CLI */}
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
                        />
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
                        />
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
                />
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
                />
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>

        {/* Right Column - With MCP */}
        <PMCard.Root
          flex={1}
          borderWidth="1px"
          borderColor="border.secondary"
          data-testid="OnboardingBuild.MCPCard"
        >
          <PMCard.Body padding={6}>
            <PMVStack gap={6} align="stretch">
              <PMHStack gap={2} align="center">
                <PMHeading level="h3">With MCP</PMHeading>
                <PMIcon as={LuCircleHelp} color="secondary" />
              </PMHStack>
              <PMText color="secondary" fontSize="sm">
                Your agent use MCP tools to start the analysis and create
                playbook artifacts in Packmind
              </PMText>

              {/* Pick coding assistant section */}
              <PMVStack gap={2} align="stretch">
                <PMText fontWeight="semibold">
                  Pick your coding assistant
                </PMText>
                <PMHStack gap={2} overflowX="auto">
                  <PMButton
                    variant="outline"
                    size="sm"
                    data-testid="OnboardingBuild.AssistantClaude"
                  >
                    Claude
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    data-testid="OnboardingBuild.AssistantCursor"
                  >
                    Cursor
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    data-testid="OnboardingBuild.AssistantCopilot"
                  >
                    Copilot
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    data-testid="OnboardingBuild.AssistantMore"
                  >
                    ...
                  </PMButton>
                </PMHStack>
              </PMVStack>

              {/* Prompt section */}
              <PMVStack gap={2} align="stretch" flex={1}>
                <PMText fontWeight="semibold">Prompt</PMText>
                <PMBox
                  bg="background.secondary"
                  borderRadius="md"
                  padding={4}
                  flex={1}
                  minHeight="120px"
                  data-testid="OnboardingBuild.PromptContent"
                />
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>
      </PMHStack>

      {/* Status and navigation */}
      <PMVStack gap={4} align="stretch">
        {/* Status indicator */}
        <PMHStack gap={3} align="center">
          <PMSpinner size="sm" />
          <PMText color="secondary" data-testid="OnboardingBuild.StatusText">
            Waiting for your playbook to be ready...
          </PMText>
        </PMHStack>

        {/* Navigation buttons */}
        <PMHStack gap={4}>
          <PMButton
            size="lg"
            variant="secondary"
            onClick={onPrevious}
            data-testid="OnboardingBuild.PreviousButton"
          >
            Previous
          </PMButton>
          <PMButton
            size="lg"
            variant="primary"
            onClick={onComplete}
            data-testid="OnboardingBuild.CompleteButton"
          >
            I'm done
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMVStack>
  );
}
