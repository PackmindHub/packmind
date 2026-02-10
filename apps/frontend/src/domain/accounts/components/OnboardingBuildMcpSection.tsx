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
  PMTooltip,
} from '@packmind/ui';
import { LuCircleHelp } from 'react-icons/lu';
import { useMcpConnection } from './LocalEnvironmentSetup/hooks/useMcpConnection';
import { getAgentsConfig } from './McpConfig/agentsConfig';
import {
  IAgentConfig,
  IInstallMethod,
  getAvailableMethods,
} from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';
import { StartTrialCommandAgents } from '@packmind/types';
import { OnboardingAgentProvider } from '../contexts';
import { getAgentIcon } from './trial/AgentIcons';
import { CopiableTextarea } from '../../../shared/components/inputs/CopiableTextarea';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

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

const TYPE_PRIORITY: Record<string, number> = {
  magicLink: 0,
  cli: 1,
  json: 2,
};

const createTabsFromMethods = (
  methods: IInstallMethod[],
  token: string,
  url: string,
) => {
  const sorted = [...methods].sort(
    (a, b) => (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99),
  );

  return sorted.map((method, index) => ({
    value: `${method.type}-${index}`,
    triggerLabel: method.label,
    content: (
      <PMVStack gap={4} width="100%" pt={4} alignItems="flex-start">
        <MethodContent method={method} token={token} url={url} />
      </PMVStack>
    ),
  }));
};

export function OnboardingBuildMcpSection() {
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);
  const { url, token, isLoading } = useMcpConnection();
  const agents = getAgentsConfig();
  const analytics = useAnalytics();

  const methodTabs = useMemo(() => {
    if (!selectedAgent || !url || !token) return [];
    const availableMethods = getAvailableMethods(selectedAgent).filter(
      (method) => method.label !== 'Packmind CLI',
    );
    if (availableMethods.length === 0) return [];
    return createTabsFromMethods(availableMethods, token, url);
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
              <PMTooltip
                label="MCP (Model Context Protocol) is an open standard that enables AI agents to connect directly with tools and services."
                placement="top"
              >
                <PMIcon
                  as={LuCircleHelp}
                  color="secondary"
                  cursor="help"
                  data-testid="OnboardingBuild.McpHelpIcon"
                />
              </PMTooltip>
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
                agents.map((agent) => {
                  const agentAnalyticsId = mapAgentIdToAnalytics(agent.id);
                  const AgentIcon = getAgentIcon(agentAnalyticsId);
                  return (
                    <PMButton
                      key={agent.id}
                      variant={
                        selectedAgent?.id === agent.id ? 'primary' : 'secondary'
                      }
                      size="sm"
                      onClick={() => {
                        analytics.track(
                          'post_signup_onboarding_agent_clicked',
                          {
                            agent: agentAnalyticsId,
                          },
                        );
                        setSelectedAgent(agent);
                      }}
                      data-testid={`OnboardingBuild.Assistant-${agent.id}`}
                    >
                      <PMIcon as={AgentIcon} />
                      {agent.name}
                    </PMButton>
                  );
                })
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
                  <PMTabs
                    key={selectedAgent.id}
                    width="100%"
                    defaultValue={methodTabs[0].value}
                    tabs={methodTabs}
                    data-testid="OnboardingBuild.McpMethodTabs"
                  />
                </OnboardingAgentProvider>
              ) : (
                <PMText color="secondary" fontSize="sm">
                  Select a coding assistant above to see setup instructions.
                </PMText>
              )}
            </PMBox>
          </PMVStack>

          {/* Start analysis prompt section - visible when agent is selected */}
          {selectedAgent && (
            <PMVStack gap={2} align="stretch">
              <PMText fontWeight="semibold">Start analysis</PMText>
              <PMText color="secondary" fontSize="sm">
                Once the MCP server is connected, copy and paste this prompt to
                your AI agent:
              </PMText>
              <CopiableTextarea
                value="Start the Packmind onboarding"
                readOnly
                rows={1}
                data-testid="OnboardingBuild.OnboardingPrompt"
                onCopy={() =>
                  analytics.track('post_signup_onboarding_field_copied', {
                    field: 'mcpStartAnalysis',
                  })
                }
              />
            </PMVStack>
          )}
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
}
