import { PMHStack } from '@packmind/ui';
import { GlobalSearchBar } from './GlobalSearchBar';

/**
 * Slim top navbar rendered above the sidebar + content shell. Holds only the
 * global search bar (per the agreed navbar scope). Themed with semantic tokens
 * — `background.primary` surface and a `border.tertiary` bottom divider — so
 * it renders correctly in the app's single dark theme.
 */
export const TopNavbar = () => {
  return (
    <PMHStack
      w="100%"
      h="52px"
      flexShrink={0}
      px={4}
      align="center"
      justify="flex-start"
      gap={0}
      backgroundColor="{colors.background.primary}"
      borderBottomWidth="1px"
      borderColor="{colors.border.tertiary}"
    >
      <GlobalSearchBar />
    </PMHStack>
  );
};
