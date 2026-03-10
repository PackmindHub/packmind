import { PMLink, PMIcon, PMBadge } from '@packmind/ui';

export function AppSidebarNavLink({
  label,
  icon,
  isActive = false,
  badge,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: { text: string; colorScheme?: string };
}) {
  return (
    <PMLink
      variant="navbar"
      data-active={isActive ? 'true' : undefined}
      as="span"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      cursor="pointer"
    >
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {icon && <PMIcon mr={2}>{icon}</PMIcon>}
        {label}
      </span>
      {badge && (
        <PMBadge
          size="sm"
          colorScheme={badge.colorScheme || 'purple'}
          ml={2}
          fontSize="xs"
        >
          {badge.text}
        </PMBadge>
      )}
    </PMLink>
  );
}
