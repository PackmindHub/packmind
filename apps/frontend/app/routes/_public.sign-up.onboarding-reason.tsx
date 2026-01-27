import { useNavigate } from 'react-router';
import { OnboardingReason } from '../../src/domain/accounts/components/OnboardingReason';
import { useAnalytics } from '../../src/domain/editions/stubs/domain/amplitude/providers/AnalyticsProvider';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { routes } from '../../src/shared/utils/routes';
import { ONBOARDING_REASONS } from '../../src/domain/accounts/components/OnboardingReason';

export default function OnboardingReasonRouteModule() {
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const { organization } = useAuthContext();

  const handleContinue = (reasonKey: string) => {
    const reason = ONBOARDING_REASONS.find((r) => r.key === reasonKey);
    if (reason) {
      analytics.track('onboarding_reason_selected', {
        reason_key: reasonKey,
        reason_label: reason.label,
      });
    }

    // Redirect to organization dashboard
    if (organization) {
      navigate(routes.org.toDashboard(organization.slug));
    } else {
      navigate('/');
    }
  };

  const handleSkip = () => {
    analytics.track('onboarding_reason_skipped', {});

    // Redirect to organization dashboard
    if (organization) {
      navigate(routes.org.toDashboard(organization.slug));
    } else {
      navigate('/');
    }
  };

  return <OnboardingReason onContinue={handleContinue} onSkip={handleSkip} />;
}
