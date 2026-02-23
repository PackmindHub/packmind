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
    <PMVStack gap={1} {...rest}>
      <PMText fontSize="sm" fontWeight="bold" color="secondary">
        {label}
      </PMText>
      {children}
    </PMVStack>
  );
}
