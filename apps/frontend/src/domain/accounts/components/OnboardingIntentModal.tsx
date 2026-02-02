import { useState, useEffect } from 'react';
import { PMDialog, PMBox, PMHStack, PMButton } from '@packmind/ui';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingPlaybook } from './OnboardingPlaybook';
import { OnboardingBuild } from './OnboardingBuild';

type OnboardingStep = 'welcome' | 'playbook' | 'build';

interface OnboardingIntentModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
  stepsToShow: OnboardingStep[];
}

export function OnboardingIntentModal({
  open,
  onComplete,
  onSkip,
  stepsToShow,
}: OnboardingIntentModalProps) {
  const [step, setStep] = useState<OnboardingStep>(stepsToShow[0] || 'welcome');

  const showBuildStep = stepsToShow.includes('build');

  // Reset step when modal opens
  useEffect(() => {
    if (open && stepsToShow.length > 0) {
      setStep(stepsToShow[0]);
    }
  }, [open, stepsToShow]);

  const handleDiscover = () => {
    setStep('playbook');
  };

  const handlePreviousToWelcome = () => {
    setStep('welcome');
  };

  const handleBuildPlaybook = () => {
    if (showBuildStep) {
      setStep('build');
    } else {
      onComplete(); // Complete if no build step for invited users
    }
  };

  const handlePreviousToPlaybook = () => {
    setStep('playbook');
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <PMDialog.Root
      open={open}
      closeOnInteractOutside={false}
      scrollBehavior="inside"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner padding={6}>
        <PMDialog.Content
          width="calc(100vw - 48px)"
          height="calc(100vh - 48px)"
          maxWidth="none"
          borderRadius="lg"
        >
          <PMDialog.Body>
            <PMBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              paddingX="5%"
              paddingY="5%"
            >
              <PMBox width="full" height="full">
                {step === 'welcome' && (
                  <OnboardingWelcome
                    onDiscover={handleDiscover}
                    onSkip={handleSkip}
                  />
                )}
                {step === 'playbook' && (
                  <OnboardingPlaybook
                    onBuildPlaybook={handleBuildPlaybook}
                    onPrevious={handlePreviousToWelcome}
                  />
                )}
                {step === 'build' && <OnboardingBuild />}
              </PMBox>
            </PMBox>
          </PMDialog.Body>
          {step === 'build' && (
            <PMDialog.Footer justifyContent="flex-start">
              <PMHStack gap={4}>
                <PMButton
                  size="lg"
                  variant="secondary"
                  onClick={handlePreviousToPlaybook}
                  data-testid="OnboardingModal.PreviousButton"
                >
                  Previous
                </PMButton>
                <PMButton
                  size="lg"
                  variant="primary"
                  onClick={handleComplete}
                  data-testid="OnboardingModal.CompleteButton"
                >
                  I'm done
                </PMButton>
              </PMHStack>
            </PMDialog.Footer>
          )}
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
}
