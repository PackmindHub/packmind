import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { StartTrialCommand } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';
import { getAgentsConfig } from '../../src/domain/accounts/components/McpConfig/agentsConfig';
import { StartTrialAgentPage } from '../../src/domain/accounts/components/StartTrialAgentPage';
import { OnboardingAgentProvider } from '../../src/domain/accounts/contexts';

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

// Map agent to preferred install method type and optional label
const AGENT_TO_PREFERRED_METHOD: Record<
  Agent,
  { type: 'magicLink' | 'cli' | 'json'; label?: string }
> = {
  cursor: { type: 'magicLink' },
  'vs-code': { type: 'magicLink' },
  claude: { type: 'cli', label: 'Claude CLI' },
  jetbrains: { type: 'json' },
  'continue-dev': { type: 'json' },
  other: { type: 'json' },
};

export default function StartTrialAgentRouteModule() {
  const { agent } = useParams<{ agent: Agent }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const mcpUrl = searchParams.get('mcpUrl');

  const agentConfig = useMemo(() => {
    if (!agent) return null;
    const mcpConfigId = AGENT_TO_MCP_CONFIG[agent as Agent];
    const configs = getAgentsConfig();
    return configs.find((c) => c.id === mcpConfigId) ?? null;
  }, [agent]);

  useEffect(() => {
    if (!token || !mcpUrl) {
      navigate(routes.auth.toStartTrial(), { replace: true });
    }
  }, [token, mcpUrl, navigate]);

  if (!token || !agent || !mcpUrl) {
    return null;
  }

  const agentLabel = AGENT_LABELS[agent as Agent] ?? agent;
  const preferredMethod = AGENT_TO_PREFERRED_METHOD[agent as Agent] ?? {
    type: 'json',
  };

  return (
    <OnboardingAgentProvider agent={agent as Agent}>
      <StartTrialAgentPage
        agentLabel={agentLabel}
        agentConfig={agentConfig}
        token={token}
        mcpUrl={mcpUrl}
        preferredMethodType={preferredMethod.type}
        preferredMethodLabel={preferredMethod.label}
      />
    </OnboardingAgentProvider>
  );
}
