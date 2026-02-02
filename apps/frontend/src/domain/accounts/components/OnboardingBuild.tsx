import { PMVStack, PMHStack, PMHeading, PMText } from '@packmind/ui';
import { OnboardingProgressSection } from './OnboardingProgressSection';
import { OnboardingBuildCliSection } from './OnboardingBuildCliSection';
import { OnboardingBuildMcpSection } from './OnboardingBuildMcpSection';
import { isLocalhost } from '../../../shared/utils/isLocalhost';

export function OnboardingBuild() {
  const showProgress = isLocalhost();

  return (
    <PMVStack
      align="stretch"
      width="full"
      height="full"
      justify="space-between"
    >
      {/* Header */}
      <PMVStack gap={2} align="start">
        <PMHeading level="h2">Build my playbook</PMHeading>
        <PMText color="secondary" fontSize="md">
          Analyze your local repository to generate an initial Playbook, based
          on the patterns your team already uses.
        </PMText>
      </PMVStack>

      {/* Progress status */}
      {showProgress && <OnboardingProgressSection />}

      {/* Two-column content */}
      <PMHStack gap={8} align="stretch" flex={1} paddingY={6}>
        <OnboardingBuildCliSection />
        <OnboardingBuildMcpSection />
      </PMHStack>
    </PMVStack>
  );
}
