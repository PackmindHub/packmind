import { ReactNode } from 'react';
import { PMText, PMVStack, PMVStackProps } from '@packmind/ui';

export function SkillOptionalField({
  label,
  children,
  ...rest
}: {
  label: string;
  children: ReactNode;
} & Omit<PMVStackProps, 'gap'>) {
  return (
    <PMVStack gap={1} {...rest} align="flex-start">
      <PMText
        fontSize="sm"
        fontWeight="bold"
        color="secondary"
        width="full"
        mb={2}
      >
        {label}
      </PMText>
      {children}
    </PMVStack>
  );
}
