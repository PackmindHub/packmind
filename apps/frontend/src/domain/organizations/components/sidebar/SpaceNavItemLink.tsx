import React from 'react';
import { PMBadge, PMBox, PMIcon, PMText, PMTooltip } from '@packmind/ui';
import { NavLink, useLocation } from 'react-router';

interface SpaceNavItemLinkProps {
  url: string;
  label: string;
  exact?: boolean;
  /** Path prefixes this entry stands for besides its own url. */
  alsoOwns?: string[];
  icon?: React.ReactNode;
  badge?: {
    /*
     * The palette name. Passed to PMBadge as `colorPalette`, which is what
     * Chakra v3 calls it: `colorScheme` is the v2 name and is silently ignored,
     * so every badge rendered here was the default grey whatever it asked for.
     * The field keeps the older name because it is set from the other repo.
     */
    text: string;
    colorScheme: string;
    tooltipLabel?: string;
  };
  'data-testid'?: string;
}

export function SpaceNavItemLink(
  props: Readonly<SpaceNavItemLinkProps>,
): React.ReactElement {
  const { url, label, exact = false, icon, badge, alsoOwns } = props;
  /*
   * Read here rather than compared inside the render prop, because what
   * `NavLink` answers is whether the address is under this entry's own url and
   * the question is broader: see `alsoOwns` on `SpaceNavItem`.
   */
  const { pathname } = useLocation();
  const owns = alsoOwns?.some((prefix) => pathname.startsWith(prefix)) ?? false;

  return (
    <NavLink to={url} end={exact} prefetch="intent">
      {({ isActive: isOwnAddress }) => {
        const isActive = isOwnAddress || owns;

        return (
          <PMBox
            display="flex"
            alignItems="center"
            gap={2}
            w="full"
            pl={4}
            pr={2}
            py={1}
            fontSize="xs"
            borderRadius="sm"
            cursor="pointer"
            bg="transparent"
            _hover={
              isActive ? undefined : { bg: 'blue.800', color: 'text.primary' }
            }
            transition="background-color 0.15s"
            textAlign="left"
            /* Same marker the collapsed rail's link carries, for the same reason. */
            data-active={isActive ? 'true' : undefined}
            data-testid={props['data-testid']}
          >
            {icon && (
              <PMIcon
                fontSize="sm"
                flexShrink={0}
                color={isActive ? 'branding.primary' : 'text.tertiary'}
              >
                {icon}
              </PMIcon>
            )}
            <PMText
              fontSize="xs"
              flex={1}
              textProps={{
                color: isActive ? 'branding.primary' : 'text.secondary',
              }}
              fontWeight={isActive ? 'semibold' : 'normal'}
            >
              {label}
            </PMText>
            {badge &&
              (badge.tooltipLabel ? (
                <PMTooltip label={badge.tooltipLabel}>
                  <PMBadge
                    size="sm"
                    colorPalette={badge.colorScheme}
                    fontSize="xs"
                  >
                    {badge.text}
                  </PMBadge>
                </PMTooltip>
              ) : (
                <PMBadge
                  size="sm"
                  colorPalette={badge.colorScheme}
                  fontSize="xs"
                >
                  {badge.text}
                </PMBadge>
              ))}
          </PMBox>
        );
      }}
    </NavLink>
  );
}
