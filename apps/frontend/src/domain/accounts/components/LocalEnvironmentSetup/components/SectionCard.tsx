import React from 'react';
import { PMVStack, PMHeading, PMText } from '@packmind/ui';
import { ISectionCardProps } from '../types';

const BORDER_COLORS = {
  primary: 'blue.700',
  secondary: 'border.tertiary',
} as const;

export const SectionCard: React.FC<ISectionCardProps> = ({
  title,
  description,
  variant = 'secondary',
  children,
}) => (
  <PMVStack
    align="flex-start"
    gap={4}
    width="full"
    border="solid 1px"
    borderColor={BORDER_COLORS[variant]}
    padding={4}
    borderRadius={4}
  >
    <PMVStack align="flex-start" gap={1}>
      <PMHeading level="h6">{title}</PMHeading>
      <PMText as="p" color="tertiary" variant="small">
        {description}
      </PMText>
    </PMVStack>
    {children}
  </PMVStack>
);
