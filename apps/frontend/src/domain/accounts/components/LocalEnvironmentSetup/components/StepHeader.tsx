import React from 'react';
import { PMVStack, PMHeading, PMText } from '@packmind/ui';

interface IStepHeaderProps {
  title: string;
  description: string;
}

export const StepHeader: React.FC<IStepHeaderProps> = ({
  title,
  description,
}) => (
  <PMVStack align="flex-start" gap={2}>
    <PMHeading level="h5">{title}</PMHeading>
    <PMText as="p" color="tertiary">
      {description}
    </PMText>
  </PMVStack>
);
