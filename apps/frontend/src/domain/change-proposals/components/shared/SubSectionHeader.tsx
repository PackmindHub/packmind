import { ReactNode } from 'react';
import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';

interface SubSectionHeaderProps {
  label: string;
  icon: ReactNode;
}

export function SubSectionHeader({
  label,
  icon,
}: Readonly<SubSectionHeaderProps>) {
  return (
    <PMBox pl={3} borderLeft="2px solid" borderColor="border.secondary">
      <PMHStack gap={2} alignItems="center">
        <PMIcon fontSize="xs" color="text.faded">
          {icon}
        </PMIcon>
        <PMText
          fontSize="xs"
          fontWeight="semibold"
          textTransform="uppercase"
          color="secondary"
        >
          {label}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}
