import { createContext, useContext } from 'react';

interface SidebarCollapseContextValue {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  isCollapsed: false,
  onToggleCollapse: () => {},
});

export const SidebarCollapseProvider = SidebarCollapseContext.Provider;

export function useSidebarCollapse(): SidebarCollapseContextValue {
  return useContext(SidebarCollapseContext);
}
