import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMLink,
  PMField,
} from '@packmind/ui';
import { StartTrialCommand } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';
import { CopiableTextarea } from '../../src/shared/components/inputs';
import {
  IAgentConfig,
  IInstallMethod,
} from '../../src/domain/accounts/components/McpConfig/types';
import { getAgentsConfig } from '../../src/domain/accounts/components/McpConfig/agentsConfig';

type Agent = StartTrialCommand['agent'];

const AGENT_LABELS: Record<Agent, string> = {
  claude: 'Claude',
  'vs-code': 'Github Copilot for VSCode',
  cursor: 'Cursor',
  jetbrains: 'Github Copilot for JetBrains',
  'continue-dev': 'Continue.dev',
  other: 'Other',
};

// Map trial agent IDs to MCP agent config IDs
const AGENT_TO_MCP_CONFIG: Record<Agent, string> = {
  claude: 'claude',
  'vs-code': 'github-copilot-vscode',
  cursor: 'cursor',
  jetbrains: 'github-copilot-jetbrains',
  'continue-dev': 'continue',
  other: 'generic',
};

const getMcpUrl = () => {
  // Hardcoded for now - will be computed based on environment
  return 'https://mcp.packmind.com/sse';
};

// VS Code icon from CDN
const VSCodeIcon = () => (
  <img
    src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg"
    alt="VS Code"
    width={16}
    height={16}
  />
);

interface IMcpConfigContentProps {
  agent: Agent;
  agentConfig: IAgentConfig;
  token: string;
  url: string;
}

const MagicLinkContent: React.FC<{
  method: IInstallMethod;
  token: string;
  url: string;
}> = ({ method, token, url }) => {
  const magicLink = method.getMagicLink?.(token, url);
  if (!magicLink) return null;

  const isVSCode = magicLink.startsWith('vscode:');

  return (
    <PMVStack gap={4} width="100%" alignItems="stretch">
      <PMText as="p" fontSize="sm" color="tertiary">
        Click the button below to install automatically:
      </PMText>
      {isVSCode ? (
        <PMLink href={magicLink} variant="plain">
          <PMButton
            as="span"
            bg="#007ACC"
            color="white"
            _hover={{ bg: '#005a9e' }}
          >
            <VSCodeIcon />
            Install in VS Code
          </PMButton>
        </PMLink>
      ) : (
        <a href={magicLink}>
          <img
            src="https://cursor.com/deeplink/mcp-install-dark.png"
            alt="Add Packmind MCP server to Cursor"
            style={{ maxHeight: 32 }}
          />
        </a>
      )}
    </PMVStack>
  );
};

const CliContent: React.FC<{
  method: IInstallMethod;
  token: string;
  url: string;
}> = ({ method, token, url }) => {
  const command = method.getCliCommand?.(token, url);
  if (!command) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="stretch">
      <PMText as="p" fontSize="sm" color="tertiary">
        Run this command in your terminal:
      </PMText>
      <CopiableTextarea value={command} readOnly rows={2} />
    </PMVStack>
  );
};

const JsonContent: React.FC<{
  method: IInstallMethod;
  token: string;
  url: string;
}> = ({ method, token, url }) => {
  const config = method.getJsonConfig?.(token, url);
  if (!config) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="stretch">
      <PMText as="p" fontSize="sm" color="tertiary">
        {method.label}:
      </PMText>
      <CopiableTextarea value={config} readOnly rows={12} />
    </PMVStack>
  );
};

const McpConfigContent: React.FC<IMcpConfigContentProps> = ({
  agent,
  agentConfig,
  token,
  url,
}) => {
  const methods = agentConfig.installMethods.filter((m) => m.available);

  // Cursor / VS Code: Magic Link only
  if (agent === 'cursor' || agent === 'vs-code') {
    const magicLinkMethod = methods.find((m) => m.type === 'magicLink');
    if (magicLinkMethod) {
      return (
        <MagicLinkContent method={magicLinkMethod} token={token} url={url} />
      );
    }
  }

  // Claude: CLI only (specifically the Claude CLI command)
  if (agent === 'claude') {
    const claudeCliMethod = methods.find(
      (m) => m.type === 'cli' && m.label === 'Claude CLI',
    );
    if (claudeCliMethod) {
      return <CliContent method={claudeCliMethod} token={token} url={url} />;
    }
  }

  // Others: JSON/YAML config
  const jsonMethod = methods.find((m) => m.type === 'json');
  if (jsonMethod) {
    return <JsonContent method={jsonMethod} token={token} url={url} />;
  }

  return null;
};

const PlaybookContent: React.FC = () => (
  <PMVStack align="flex-start" gap={4}>
    <PMField.Root width="full">
      <PMField.Label>
        Prompt: Get started with on-boarding MCP tool
      </PMField.Label>
      <CopiableTextarea
        value="Run the Packmind on-boarding process"
        readOnly
        rows={1}
        width="full"
      />
    </PMField.Root>
  </PMVStack>
);

export default function StartTrialAgentRouteModule() {
  const { agent } = useParams<{ agent: Agent }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const mcpUrl = getMcpUrl();

  const agentConfig = useMemo(() => {
    if (!agent) return null;
    const mcpConfigId = AGENT_TO_MCP_CONFIG[agent as Agent];
    const configs = getAgentsConfig();
    return configs.find((c) => c.id === mcpConfigId) ?? null;
  }, [agent]);

  useEffect(() => {
    if (!token) {
      navigate(routes.auth.toStartTrial(), { replace: true });
    }
  }, [token, navigate]);

  if (!token || !agent) {
    return null;
  }

  const agentLabel = AGENT_LABELS[agent as Agent] ?? agent;

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Start with {agentLabel}</PMHeading>
        <PMText color="secondary" mt={2}>
          Get up and running in 2 simple steps
        </PMText>
      </PMBox>

      <PMVStack gap={8} align="stretch">
        <PMBox>
          <PMHeading level="h4" mb={4}>
            1 - Install
          </PMHeading>
          {agentConfig && (
            <McpConfigContent
              agent={agent as Agent}
              agentConfig={agentConfig}
              token={token}
              url={mcpUrl}
            />
          )}
        </PMBox>

        <PMBox>
          <PMHeading level="h4" mb={2}>
            2 - Create your playbook
          </PMHeading>
          <PMText as="p" mb={4} color="secondary">
            Create instructions tailored to your project context.
          </PMText>
          <PlaybookContent />
        </PMBox>
      </PMVStack>
    </PMVStack>
  );
}
