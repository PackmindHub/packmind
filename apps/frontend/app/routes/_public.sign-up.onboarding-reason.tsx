import { useNavigate } from 'react-router';
import { OnboardingReason } from '../../src/domain/accounts/components/OnboardingReason';

export default function OnboardingReasonRouteModule() {
  const navigate = useNavigate();

  const handleContinue = (reasonKey: string) => {
    // TODO: Track analytics event in next step
    console.log('Selected reason:', reasonKey);
    // Redirect to organization dashboard (will be implemented in next step)
    navigate('/');
  };

  const handleSkip = () => {
    // TODO: Track analytics event in next step
    console.log('Skipped onboarding reason');
    // Redirect to organization dashboard (will be implemented in next step)
    navigate('/');
  };

  return <OnboardingReason onContinue={handleContinue} onSkip={handleSkip} />;
}
