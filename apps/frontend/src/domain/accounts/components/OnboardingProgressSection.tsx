import { PMHStack, PMSpinner, PMText } from '@packmind/ui';

export function OnboardingProgressSection() {
  return (
    <PMHStack gap={3} align="center">
      <PMSpinner size="sm" />
      <PMText color="secondary" data-testid="OnboardingBuild.StatusText">
        Waiting for your playbook to be ready...
      </PMText>
    </PMHStack>
  );
}
