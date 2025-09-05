import React from 'react';
import { UIProvider } from '@packmind/ui';

// Default implementation, that you can customize
export default function Root({ children }: { children: React.ReactNode }) {
  return <UIProvider preflight={false}>{children}</UIProvider>;
}
