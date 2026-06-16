import { PMHeading } from '@packmind/ui';
import type { ReactNode } from 'react';

export function OverviewSectionLabel({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PMHeading
      level="h2"
      color="faded"
      fontSize="xs"
      fontWeight="medium"
      textTransform="uppercase"
      letterSpacing="0.08em"
    >
      {children}
    </PMHeading>
  );
}
