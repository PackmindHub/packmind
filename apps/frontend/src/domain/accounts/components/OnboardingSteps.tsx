import React from 'react';
import { PMAccordion, PMBox, PMText, PMVStack } from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';

export const OnboardingSteps: React.FC = () => {
  return (
    <PMBox>
      <PMAccordion.Root defaultValue={['step-1']}>
        <PMAccordion.Item value="step-1">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Configure your local environment
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6}>
              <SetupLocalEnvironment />
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item value="step-2">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Build your playbook
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6}>
              <PMText color="secondary">
                Content for step 2 will be added here
              </PMText>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item value="step-3">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Vibe code with confidence
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6}>
              <PMText color="secondary">
                Content for step 3 will be added here
              </PMText>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMBox>
  );
};
