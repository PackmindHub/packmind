import { PMFlex } from '@packmind/ui';

export function NavBadge({ children }: { children: React.ReactNode }) {
  return (
    <PMFlex
      alignItems="center"
      justifyContent="center"
      bg="yellow.800"
      color="yellow.200"
      borderRadius="full"
      minWidth="24px"
      height="24px"
      fontSize="xs"
      fontWeight="bold"
      flexShrink={0}
      px={1}
    >
      {children}
    </PMFlex>
  );
}
