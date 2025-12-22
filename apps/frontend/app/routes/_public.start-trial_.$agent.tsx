import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { PMBox, PMVStack, PMHeading, PMText } from '@packmind/ui';
import { StartTrialCommand } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';

type Agent = StartTrialCommand['agent'];

const AGENT_LABELS: Record<Agent, string> = {
  claude: 'Claude',
  'vs-code': 'Github Copilot for VSCode',
  cursor: 'Cursor',
  jetbrains: 'Github Copilot for JetBrains',
  'continue-dev': 'Continue.dev',
  other: 'Other',
};

export default function StartTrialAgentRouteModule() {
  const { agent } = useParams<{ agent: Agent }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

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
          Complete your registration to start using Packmind
        </PMText>
      </PMBox>
    </PMVStack>
  );
}
