import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMAlert,
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMField,
  PMButton,
  PMIcon,
  PMHStack,
  PMBadge,
} from '@packmind/ui';
import {
  LuLink,
  LuFileText,
  LuShield,
  LuArrowRight,
  LuCheck,
  LuPlay,
  LuTerminal,
  LuSettings,
} from 'react-icons/lu';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { IAgentConfig } from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';
import { trialGateway } from '../api/gateways';
import { StartTrialAgentPageDataTestIds } from '@packmind/frontend';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../contexts';
import { CantUseMcpModal } from './trial/CantUseMcpModal';

interface IStartTrialAgentPageProps {
  agentLabel: string;
  agentConfig: IAgentConfig | null;
  token: string;
  mcpUrl: string;
  cliLoginCode?: string;
  preferredMcpMethodType?: 'magicLink' | 'cli' | 'json';
  preferredMcpMethodLabel?: string;
}

const getInstallCliMethod = (agentConfig: IAgentConfig) => {
  return (
    agentConfig.installMethods.find(
      (m) => m.type === 'install-cli' && m.available,
    ) ?? null
  );
};

const getMcpConfigMethods = (agentConfig: IAgentConfig) => {
  return agentConfig.installMethods.filter(
    (m) => m.type !== 'install-cli' && m.available,
  );
};

const PlaybookContent: React.FC = () => {
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();

  return (
    <PMVStack align="flex-start" gap={4}>
      <PMField.Root width="full">
        <PMField.Label>Submit this prompt to your AI Agent</PMField.Label>
        <CopiableTextarea
          value="Run the Packmind onboarding process"
          readOnly
          rows={1}
          width="full"
          onCopy={() => analytics.track('onboarding_prompt_copied', { agent })}
        />
      </PMField.Root>
    </PMVStack>
  );
};

export const StartTrialAgentPage: React.FC<IStartTrialAgentPageProps> = ({
  agentLabel,
  agentConfig,
  token,
  mcpUrl,
  cliLoginCode,
  preferredMcpMethodType,
  preferredMcpMethodLabel,
}) => {
  const navigate = useNavigate();
  const agent = useOnboardingAgent();
  const [isCantUseMcpModalOpen, setIsCantUseMcpModalOpen] = useState(false);

  // Améliore le titre pour l'option "other"
  const getAgentTitle = (label: string) => {
    if (label.trim().toLowerCase() === 'other') {
      return 'Start with your agent';
    }
    return `Start with ${label}`;
  };
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [playbookGenerated, setPlaybookGenerated] = useState(false);

  const isLocalDev =
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port === '4200';

  const installCliMethod = agentConfig
    ? getInstallCliMethod(agentConfig)
    : null;
  const mcpMethods = agentConfig ? getMcpConfigMethods(agentConfig) : [];
  const preferredMcpMethod =
    mcpMethods.length > 0
      ? (mcpMethods.find(
          (m) =>
            m.type === preferredMcpMethodType &&
            (!preferredMcpMethodLabel || m.label === preferredMcpMethodLabel),
        ) ??
        mcpMethods.find((m) => m.type === preferredMcpMethodType) ??
        mcpMethods[0])
      : null;

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    setAccountError(null);

    try {
      const { activationUrl } = await trialGateway.getActivationToken({
        mcpToken: token,
      });
      // Use relative navigation to work regardless of the host (localhost vs Docker)
      const url = new URL(activationUrl);
      navigate(url.pathname + url.search);
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'Failed to create account',
      );
      setIsCreatingAccount(false);
    }
  };

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">
          Generate AI agent playbook from this project
        </PMHeading>
        <PMText color="secondary" mt={2}>
          Your project will be analyzed locally and a playbook will be generated
          for {agentLabel}
        </PMText>
      </PMBox>

      <PMVStack gap={8} align="stretch">
        <PMBox
          borderRadius="lg"
          borderWidth="1px"
          borderColor={mcpConnected ? 'green.500' : 'blue.500'}
          bg={mcpConnected ? 'green.1000' : 'blue.1000'}
          transition="all 0.3s"
          _hover={{ shadow: 'md' }}
          overflow="hidden"
        >
          <PMBox p={6}>
            <PMHStack mb={3} gap={3}>
              <PMBadge
                size="lg"
                colorScheme={mcpConnected ? 'green' : 'primary'}
                borderRadius="full"
                px={3}
                py={1}
                fontWeight="bold"
              >
                1
              </PMBadge>
              <PMIcon
                as={LuLink}
                size="xl"
                color={mcpConnected ? 'green.600' : 'blue.600'}
              />
            </PMHStack>
            <PMHeading level="h4" mb={2}>
              Connect your AI assistant
            </PMHeading>
            <PMText as="p" mb={4} color="primary">
              Follow the setup instructions to connect {agentLabel} to your
              local project analysis
            </PMText>
            <PMVStack gap={4}>
              {/* Install CLI Box - Only shown in local development */}
              {isLocalDev && installCliMethod && (
                <PMBox
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.700"
                  bg="gray.900"
                  p={4}
                  w={'full'}
                >
                  <PMHStack mb={2} gap={2}>
                    <PMIcon as={LuTerminal} color="blue.400" />
                    <PMText fontWeight="semibold">Install Packmind CLI</PMText>
                  </PMHStack>
                  <PMText fontSize="sm" color="secondary" mb={3}>
                    Install the CLI to automatically configure your AI assistant
                  </PMText>
                  <MethodContent
                    method={installCliMethod}
                    token={token}
                    url={mcpUrl}
                    cliLoginCode={cliLoginCode}
                  />
                </PMBox>
              )}

              {/* MCP Config Box */}
              {preferredMcpMethod && (
                <PMBox
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.700"
                  bg="gray.900"
                  p={4}
                  w={'full'}
                >
                  <PMHStack mb={2} gap={2}>
                    <PMIcon as={LuSettings} color="blue.400" />
                    <PMText fontWeight="semibold">
                      Install Packmind MCP server
                    </PMText>
                  </PMHStack>

                  <MethodContent
                    method={preferredMcpMethod}
                    token={token}
                    url={mcpUrl}
                    cliLoginCode={cliLoginCode}
                    onCantUseMcp={() => setIsCantUseMcpModalOpen(true)}
                  />
                </PMBox>
              )}
            </PMVStack>
          </PMBox>
          {!mcpConnected && (
            <PMBox
              p={4}
              bg={mcpConnected ? 'green.900' : 'blue.900'}
              borderTopWidth="1px"
              borderTopColor={mcpConnected ? 'green.700' : 'blue.700'}
              textAlign={'center'}
            >
              <PMButton
                onClick={() => setMcpConnected(true)}
                size="sm"
                variant="outline"
              >
                <PMIcon as={LuCheck} mr={2} />
                Setup completed
              </PMButton>
            </PMBox>
          )}
        </PMBox>

        {mcpConnected && (
          <PMBox
            borderRadius="lg"
            borderWidth="1px"
            borderColor={playbookGenerated ? 'green.500' : 'blue.500'}
            bg={playbookGenerated ? 'green.1000' : 'blue.1000'}
            transition="all 0.3s"
            _hover={{ shadow: 'md' }}
            overflow="hidden"
          >
            <PMBox p={6}>
              <PMHStack mb={3} gap={3}>
                <PMBadge
                  size="lg"
                  colorScheme={playbookGenerated ? 'green' : 'primary'}
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontWeight="bold"
                >
                  2
                </PMBadge>
                <PMIcon
                  as={LuFileText}
                  size="xl"
                  color={playbookGenerated ? 'green.600' : 'blue.600'}
                />
              </PMHStack>
              <PMHeading level="h4" mb={2}>
                Generate project playbook
              </PMHeading>
              <PMText as="p" mb={4} color="primary">
                Run the analysis to generate coding standards and agent
                instructions
              </PMText>
              <PlaybookContent />
            </PMBox>
            {!playbookGenerated && (
              <PMBox
                p={4}
                bg={playbookGenerated ? 'green.900' : 'blue.900'}
                borderTopWidth="1px"
                borderTopColor={playbookGenerated ? 'green.700' : 'blue.700'}
                textAlign={'center'}
              >
                <PMButton
                  onClick={() => setPlaybookGenerated(true)}
                  size="sm"
                  variant="outline"
                >
                  <PMIcon as={LuPlay} mr={2} />
                  Analysis completed
                </PMButton>
              </PMBox>
            )}
          </PMBox>
        )}

        {mcpConnected && playbookGenerated && (
          <PMBox
            borderRadius="lg"
            borderWidth="1px"
            borderColor="green.500"
            bg="green.1000"
            transition="all 0.3s"
            _hover={{ shadow: 'md' }}
            overflow="hidden"
          >
            <PMBox p={6}>
              <PMHStack mb={3} gap={3}>
                <PMBadge
                  size="lg"
                  colorScheme="green"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontWeight="bold"
                >
                  3
                </PMBadge>
                <PMIcon as={LuShield} size="xl" color="green.600" />
              </PMHStack>
              <PMHeading level="h4" mb={2}>
                Playbook generated successfully
              </PMHeading>
              <PMText as="p" mb={4} color="primary">
                Your project has been analyzed and your playbook is ready in
                your IDE
              </PMText>
            </PMBox>
            <PMBox
              p={4}
              bg="green.900"
              borderTopWidth="1px"
              borderTopColor="green.700"
            >
              <PMButton
                onClick={handleCreateAccount}
                loading={isCreatingAccount}
                disabled={isCreatingAccount}
                data-testid={StartTrialAgentPageDataTestIds.CreateAccountButton}
                size="lg"
                width="full"
                colorScheme="primary"
                mb={accountError ? 3 : 0}
              >
                Save and reuse across projects
                <PMIcon as={LuArrowRight} ml={2} />
              </PMButton>
              {accountError && (
                <PMAlert.Root status="error" mt={2}>
                  <PMAlert.Indicator />
                  <PMAlert.Title>{accountError}</PMAlert.Title>
                </PMAlert.Root>
              )}
            </PMBox>
          </PMBox>
        )}
      </PMVStack>

      <CantUseMcpModal
        isOpen={isCantUseMcpModalOpen}
        onClose={() => setIsCantUseMcpModalOpen(false)}
        selectedAgent={agent}
      />
    </PMVStack>
  );
};
