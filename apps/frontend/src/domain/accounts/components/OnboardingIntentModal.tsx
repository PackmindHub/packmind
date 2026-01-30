import { useState } from 'react';
import { PMDialog, PMBox } from '@packmind/ui';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingPlaybook } from './OnboardingPlaybook';

type OnboardingStep = 'welcome' | 'playbook';

interface OnboardingIntentModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingIntentModal({
  open,
  onComplete,
  onSkip,
}: OnboardingIntentModalProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');

  const handleDiscover = () => {
    setStep('playbook');
  };

  const handlePrevious = () => {
    setStep('welcome');
  };

  const handleBuildPlaybook = () => {
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
                    onPrevious={handlePrevious}
                  />
                )}
              </PMBox>
            </PMBox>
          </PMDialog.Body>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
}
