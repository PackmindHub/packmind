import { createContext, useContext } from 'react';

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
