import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface SidebarCollapseContextValue {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  isCollapsed: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onToggleCollapse: () => {},
});

export const SidebarCollapseProvider = SidebarCollapseContext.Provider;

export function useSidebarCollapse(): SidebarCollapseContextValue {
  return useContext(SidebarCollapseContext);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const STATIC_COLLAPSE_VALUE: SidebarCollapseContextValue = {
  isCollapsed: false,
  onToggleCollapse: () => {},
};

export function StaticSidebarCollapseProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarCollapseProvider value={STATIC_COLLAPSE_VALUE}>
      {children}
    </SidebarCollapseProvider>
  );
}
