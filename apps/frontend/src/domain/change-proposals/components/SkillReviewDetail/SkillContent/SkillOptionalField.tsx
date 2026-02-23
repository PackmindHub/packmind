import { ReactNode } from 'react';
import { PMText, PMVStack } from '@packmind/ui';

export function SkillOptionalField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <PMVStack gap={1}>
      <PMText fontSize="sm" fontWeight="bold" color="secondary">
        {label}
      </PMText>
      {children}
    </PMVStack>
  );
}
