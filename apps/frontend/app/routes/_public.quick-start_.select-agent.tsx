import { useNavigate } from 'react-router';
import { StartTrialAgentSelector } from '../../src/domain/accounts/components';
import { routes } from '../../src/shared/utils/routes';

export default function StartTrialSelectAgentRouteModule() {
  const navigate = useNavigate();

  return (
    <StartTrialAgentSelector
      onTokenAvailable={(agent, token, mcpUrl, cliLoginCode) => {
        navigate(
          routes.auth.toStartTrialAgent(agent, token, mcpUrl, cliLoginCode),
        );
      }}
    />
  );
}
