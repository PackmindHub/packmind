import { PMVStack, PMHStack, PMHeading, PMText, PMButton } from '@packmind/ui';
import { OnboardingProgressSection } from './OnboardingProgressSection';
import { OnboardingBuildCliSection } from './OnboardingBuildCliSection';
import { OnboardingBuildMcpSection } from './OnboardingBuildMcpSection';

interface OnboardingBuildProps {
  onComplete: () => void;
  onPrevious: () => void;
}

export function OnboardingBuild({
  onComplete,
  onPrevious,
}: OnboardingBuildProps) {
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

      {/* Two-column content */}
      <PMHStack gap={8} align="stretch" flex={1} paddingY={6}>
        <OnboardingBuildCliSection />
        <OnboardingBuildMcpSection />
      </PMHStack>

      {/* Status and navigation */}
      <PMVStack gap={4} align="stretch">
        <OnboardingProgressSection />

        {/* Navigation buttons */}
        <PMHStack gap={4}>
          <PMButton
            size="lg"
            variant="secondary"
            onClick={onPrevious}
            data-testid="OnboardingBuild.PreviousButton"
          >
            Previous
          </PMButton>
          <PMButton
            size="lg"
            variant="primary"
            onClick={onComplete}
            data-testid="OnboardingBuild.CompleteButton"
          >
            I'm done
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMVStack>
  );
}
