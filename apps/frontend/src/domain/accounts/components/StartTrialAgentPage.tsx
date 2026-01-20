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
import { LuLink, LuFileText, LuShield, LuArrowRight } from 'react-icons/lu';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { IAgentConfig } from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';
import { trialGateway } from '../api/gateways';
import { StartTrialAgentPageDataTestIds } from '@packmind/frontend';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../contexts';

interface IStartTrialAgentPageProps {
  agentLabel: string;
  agentConfig: IAgentConfig | null;
  token: string;
  mcpUrl: string;
  preferredMethodType: 'magicLink' | 'cli' | 'json';
  preferredMethodLabel?: string;
}

const getPreferredMethod = (
  agentConfig: IAgentConfig,
  preferredType: IStartTrialAgentPageProps['preferredMethodType'],
  preferredLabel?: string,
) => {
  const availableMethods = agentConfig.installMethods.filter(
    (m) => m.available,
  );

  // Try to find the preferred method type with optional label match
  const preferred = availableMethods.find(
    (m) =>
      m.type === preferredType &&
      (!preferredLabel || m.label === preferredLabel),
  );
  if (preferred) return preferred;

  // Fallback to just type match
  const typeMatch = availableMethods.find((m) => m.type === preferredType);
  if (typeMatch) return typeMatch;

  // Fallback to first available method
  return availableMethods[0] ?? null;
};

const PlaybookContent: React.FC = () => {
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();

  return (
    <PMVStack align="flex-start" gap={4}>
      <PMField.Root width="full">
        <PMField.Label>
          Prompt: Generate playbook for this project
        </PMField.Label>
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
  preferredMethodType,
  preferredMethodLabel,
}) => {
  const navigate = useNavigate();

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

  const method = agentConfig
    ? getPreferredMethod(agentConfig, preferredMethodType, preferredMethodLabel)
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
          p={6}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.700"
          bg="gray.800"
          transition="all 0.2s"
          _hover={{ borderColor: 'primary', shadow: 'md' }}
        >
          <PMHStack mb={3} gap={3}>
            <PMBadge
              size="lg"
              colorScheme="primary"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="bold"
            >
              1
            </PMBadge>
            <PMIcon as={LuLink} size="xl" color="text.faded" />
          </PMHStack>
          <PMHeading level="h4" mb={2}>
            Enable local analysis
          </PMHeading>
          <PMText as="p" mb={4} color="secondary">
            Connect {agentLabel} to Packmind so your project can be analyzed
            locally
          </PMText>
          {method && (
            <MethodContent method={method} token={token} url={mcpUrl} />
          )}
          {!mcpConnected && (
            <PMButton
              onClick={() => setMcpConnected(true)}
              mt={4}
              size="sm"
              variant="outline"
            >
              I've completed the setup
            </PMButton>
          )}
        </PMBox>

        {mcpConnected && (
          <PMBox
            p={6}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.700"
            bg="gray.800"
            transition="all 0.2s"
            _hover={{ borderColor: 'primary', shadow: 'md' }}
          >
            <PMHStack mb={3} gap={3}>
              <PMBadge
                size="lg"
                colorScheme="primary"
                borderRadius="full"
                px={3}
                py={1}
                fontWeight="bold"
              >
                2
              </PMBadge>
              <PMIcon as={LuFileText} size="xl" color="text.faded" />
            </PMHStack>
            <PMHeading level="h4" mb={2}>
              Generate project playbook
            </PMHeading>
            <PMText as="p" mb={4} color="secondary">
              Run the analysis to generate coding standards and agent
              instructions
            </PMText>
            <PlaybookContent />
            {!playbookGenerated && (
              <PMButton
                onClick={() => setPlaybookGenerated(true)}
                mt={4}
                size="sm"
                variant="outline"
              >
                I've run the analysis
              </PMButton>
            )}
          </PMBox>
        )}

        {mcpConnected && playbookGenerated && (
          <PMBox
            p={6}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.700"
            bg="gray.800"
            transition="all 0.2s"
            _hover={{ borderColor: 'primary', shadow: 'md' }}
          >
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
              <PMIcon as={LuShield} size="xl" color="text.faded" />
            </PMHStack>
            <PMHeading level="h4" mb={2}>
              Playbook generated successfully
            </PMHeading>
            <PMText as="p" mb={4} color="secondary">
              Your project has been analyzed and your playbook is ready in your
              IDE
            </PMText>
            <PMButton
              onClick={handleCreateAccount}
              loading={isCreatingAccount}
              disabled={isCreatingAccount}
              data-testid={StartTrialAgentPageDataTestIds.CreateAccountButton}
              size="lg"
              width="full"
              colorScheme="primary"
              mb={3}
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
        )}
      </PMVStack>
    </PMVStack>
  );
};
