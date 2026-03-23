import React from 'react';
import { PMBadge, PMBox, PMIcon, PMText, PMTooltip } from '@packmind/ui';
import { NavLink } from 'react-router';

interface SpaceNavItemLinkProps {
  url: string;
  label: string;
  exact?: boolean;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    colorScheme: string;
    tooltipLabel?: string;
  };
  'data-testid'?: string;
}

export function SpaceNavItemLink(
  props: Readonly<SpaceNavItemLinkProps>,
): React.ReactElement {
  const { url, label, exact = false, icon, badge } = props;

  return (
    <NavLink to={url} end={exact} prefetch="intent">
      {({ isActive }) => (
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
                  colorScheme={badge.colorScheme}
                  fontSize="xs"
                >
                  {badge.text}
                </PMBadge>
              </PMTooltip>
            ) : (
              <PMBadge size="sm" colorScheme={badge.colorScheme} fontSize="xs">
                {badge.text}
              </PMBadge>
            ))}
        </PMBox>
      )}
    </NavLink>
  );
}
