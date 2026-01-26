import { useNavigate } from 'react-router';
import { PreInstallationInfo } from '../../src/domain/accounts/components/PreInstallationInfo';
import { routes } from '../../src/shared/utils/routes';

export default function StartTrialRouteModule() {
  const navigate = useNavigate();

  return (
    <PreInstallationInfo
      onContinue={() => navigate(routes.auth.toStartTrialSelectAgent())}
    />
  );
}
