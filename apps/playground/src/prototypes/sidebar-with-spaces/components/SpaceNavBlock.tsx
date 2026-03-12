import { PMIcon, PMBox, PMText } from '@packmind/ui';
import { LuStar } from 'react-icons/lu';

import type { Space } from '../types';

export function SpaceNavBlock({
  space,
  isActive = false,
  activeKey,
  onSpaceClick,
  onItemClick,
  isPinned,
  onPinToggle,
}: Readonly<{
  space: Space;
  isActive?: boolean;
  activeKey?: string;
  onSpaceClick: () => void;
  onItemClick?: (key: string) => void;
  isPinned: boolean;
  onPinToggle: () => void;
}>) {
  return (
    <PMBox>
      <PMBox
        role="group"
        display="flex"
        alignItems="center"
        gap={1}
        paddingX={2}
        paddingY={1}
        borderRadius="sm"
        cursor="pointer"
        bg={isActive ? 'blue.900' : 'transparent'}
        _hover={isActive ? undefined : { backgroundColor: 'blue.800' }}
        transition="background-color 0.15s"
      >
        <PMBox
          as="button"
          onClick={onSpaceClick}
          display="flex"
          alignItems="center"
          gap={1}
          flex={1}
          minW={0}
          fontSize="xs"
          fontWeight={isActive ? 'semibold' : 'medium'}
          color="text.primary"
          textAlign="left"
        >
          <PMBox
            w="8px"
            h="8px"
            borderRadius="full"
            flexShrink={0}
            bg={space.color}
          />
          {space.icon && (
            <PMIcon fontSize="sm" color="text.tertiary">
              {space.icon}
            </PMIcon>
          )}
          <PMText
            color="primary"
            fontSize="xs"
            fontWeight="medium"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {space.name}
          </PMText>
        </PMBox>
        <PMBox
          as="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onPinToggle();
          }}
          title={isPinned ? 'Unpin space' : 'Pin space'}
          flexShrink={0}
          transition="opacity 0.15s"
          color={isPinned ? 'yellow.400' : 'text.faded'}
          _hover={{ color: 'yellow.400' }}
          display="flex"
          alignItems="center"
        >
          <LuStar size={12} fill={isPinned ? 'currentColor' : 'none'} />
        </PMBox>
      </PMBox>

      {/* Inline nav for active space */}
      {isActive && onItemClick && activeKey && (
        <PMBox mt={2} pb={3}>
          {space.sections.map((section, sectionIdx) => (
            <PMBox key={section.heading ?? 'root'} mt={sectionIdx > 0 ? 2 : 0}>
              {section.heading && (
                <PMBox
                  paddingLeft={5}
                  paddingRight={2}
                  paddingBottom={0.5}
                  fontSize="9px"
                  fontWeight="medium"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="text.faded"
                  opacity={0.7}
                >
                  {section.heading}
                </PMBox>
              )}
              {section.items.map((item) => {
                const key = `${space.id}:${item.id}`;
                const isItemActive = activeKey === key;
                return (
                  <PMBox
                    key={key}
                    as="button"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    w="full"
                    pl={5}
                    pr={2}
                    py={1}
                    fontSize="xs"
                    borderRadius="sm"
                    cursor="pointer"
                    bg={isItemActive ? 'blue.900' : 'transparent'}
                    color={isItemActive ? 'text.primary' : 'text.secondary'}
                    fontWeight={isItemActive ? 'semibold' : 'normal'}
                    _hover={
                      isItemActive
                        ? undefined
                        : { bg: 'blue.800', color: 'text.primary' }
                    }
                    transition="background-color 0.15s"
                    textAlign="left"
                    onClick={() => onItemClick(key)}
                  >
                    {item.icon && (
                      <PMIcon
                        fontSize="xs"
                        flexShrink={0}
                        color={isItemActive ? 'text.secondary' : 'text.faded'}
                      >
                        {item.icon}
                      </PMIcon>
                    )}
                    {item.label}
                  </PMBox>
                );
              })}
            </PMBox>
          ))}
        </PMBox>
      )}
    </PMBox>
  );
}
