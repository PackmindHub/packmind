import { PMVStack, PMHeading, PMText } from '@packmind/ui';
import { OnboardingProgressSection } from './OnboardingProgressSection';
import { OnboardingBuildCliSection } from './OnboardingBuildCliSection';
import { isLocalhost } from '../../../shared/utils/isLocalhost';

export function OnboardingBuild() {
  const showProgress = isLocalhost();

  return (
    <PMVStack align="stretch" width="full" height="full" gap={6}>
      {/* Header */}
      <PMVStack gap={2} align="start">
        <PMHeading level="h2">Build my playbook</PMHeading>
        <PMText color="secondary" fontSize="md">
          Install the Packmind CLI, then analyze your codebase to generate an
          initial Playbook based on the patterns your team already uses.
        </PMText>
      </PMVStack>

      {/* Progress status */}
      {showProgress && <OnboardingProgressSection />}

      {/* CLI Setup Flow */}
      <OnboardingBuildCliSection />
    </PMVStack>
  );
}
