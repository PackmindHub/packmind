import { useMemo, useState } from 'react';
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
import { useMcpConnection } from './LocalEnvironmentSetup/hooks/useMcpConnection';
import { getAgentsConfig } from './McpConfig/agentsConfig';
import {
  IAgentConfig,
  IInstallMethod,
  groupMethodsByType,
  getAvailableMethods,
} from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';
import { StartTrialCommandAgents } from '@packmind/types';
import { OnboardingAgentProvider } from '../contexts';

const mapAgentIdToAnalytics = (agentId: string): StartTrialCommandAgents => {
  const mapping: Record<string, StartTrialCommandAgents> = {
    claude: 'claude',
    'github-copilot-vscode': 'vs-code',
    'github-copilot-jetbrains': 'jetbrains',
    cursor: 'cursor',
    continue: 'continue-dev',
    generic: 'other',
  };
  return mapping[agentId] ?? 'other';
};

const createTabsFromMethods = (
  methodsByType: Record<string, IInstallMethod[]>,
  token: string,
  url: string,
) => {
  const orderedTypes = ['magicLink', 'cli', 'json'];

  return orderedTypes
    .filter((type) => methodsByType[type])
    .map((type) => {
      const methods = methodsByType[type];
      const firstMethod = methods[0];
      const uniqueKey = methods.length > 1 ? `${type}-multi` : type;

      return {
        value: uniqueKey,
        triggerLabel: firstMethod.label,
        content: (
          <PMVStack gap={4} width="100%" alignItems="flex-start">
            {methods.length > 1 ? (
              <PMVStack gap={6} width="100%" alignItems="flex-start">
                {methods.map((method, index) => (
                  <PMVStack
                    key={index}
                    gap={2}
                    width="100%"
                    alignItems="flex-start"
                  >
                    <PMText as="p" fontWeight="bold">
                      {method.label}
                    </PMText>
                    <MethodContent method={method} token={token} url={url} />
                  </PMVStack>
                ))}
              </PMVStack>
            ) : (
              <MethodContent method={firstMethod} token={token} url={url} />
            )}
          </PMVStack>
        ),
      };
    });
};

export function OnboardingBuildMcpSection() {
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);
  const { url, token, isLoading } = useMcpConnection();
  const agents = getAgentsConfig();

  const methodTabs = useMemo(() => {
    if (!selectedAgent || !url || !token) return [];
    const availableMethods = getAvailableMethods(selectedAgent);
    if (availableMethods.length === 0) return [];
    const methodsByType = groupMethodsByType(availableMethods);
    return createTabsFromMethods(methodsByType, token, url);
  }, [selectedAgent, url, token]);

  return (
    <PMCard.Root
      flex={1}
      borderWidth="1px"
      borderColor="border.secondary"
      data-testid="OnboardingBuild.MCPCard"
    >
      <PMCard.Body padding={6}>
        <PMVStack gap={6} align="stretch">
          <PMVStack gap={2} align="start">
            <PMHStack gap={2} align="center">
              <PMHeading level="h3">With MCP</PMHeading>
              <PMIcon as={LuCircleHelp} color="secondary" />
            </PMHStack>
            <PMText color="secondary" fontSize="sm">
              Agent-only: native protocol for direct integration
            </PMText>
          </PMVStack>

          {/* Pick coding assistant section */}
          <PMVStack gap={2} align="stretch">
            <PMText fontWeight="semibold">Pick your coding assistant</PMText>
            <PMHStack gap={2} flexWrap="wrap">
              {isLoading ? (
                <PMSpinner size="sm" data-testid="OnboardingBuild.McpLoading" />
              ) : (
                agents.map((agent) => (
                  <PMButton
                    key={agent.id}
                    variant={
                      selectedAgent?.id === agent.id ? 'primary' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedAgent(agent)}
                    data-testid={`OnboardingBuild.Assistant-${agent.id}`}
                  >
                    {agent.name}
                  </PMButton>
                ))
              )}
            </PMHStack>
          </PMVStack>

          {/* Instructions section */}
          <PMVStack gap={2} align="stretch" flex={1}>
            <PMText fontWeight="semibold">Instructions</PMText>
            <PMBox
              bg="background.secondary"
              borderRadius="md"
              padding={4}
              flex={1}
              minHeight="120px"
              data-testid="OnboardingBuild.InstructionsContent"
            >
              {selectedAgent && methodTabs.length > 0 ? (
                <OnboardingAgentProvider
                  agent={mapAgentIdToAnalytics(selectedAgent.id)}
                >
                  {methodTabs.length === 1 ? (
                    methodTabs[0].content
                  ) : (
                    <PMTabs
                      width="100%"
                      defaultValue={methodTabs[0].value}
                      tabs={methodTabs}
                      data-testid="OnboardingBuild.McpMethodTabs"
                    />
                  )}
                </OnboardingAgentProvider>
              ) : (
                <PMText color="secondary" fontSize="sm">
                  Select a coding assistant above to see setup instructions.
                </PMText>
              )}
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
}
