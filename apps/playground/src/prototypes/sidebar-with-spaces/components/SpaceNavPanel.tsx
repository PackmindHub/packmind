import type { RefObject } from 'react';
import {
  PMIcon,
  PMBox,
  PMHStack,
  PMPortal,
  PMDrawer,
  PMCloseButton,
} from '@packmind/ui';

import type { Space } from '../types';

export function SpaceNavPanel({
  space,
  activeKey,
  onItemClick,
  open,
  onClose,
  containerRef,
}: Readonly<{
  space: Space;
  activeKey: string;
  onItemClick: (key: string) => void;
  open: boolean;
  onClose: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}>) {
  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="start"
      size="xs"
    >
      <PMPortal container={containerRef}>
        <PMDrawer.Backdrop position="absolute" />
        <PMDrawer.Positioner position="absolute">
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMHStack gap={2} flex={1}>
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
                <PMDrawer.Title fontSize="sm">{space.name}</PMDrawer.Title>
              </PMHStack>
            </PMDrawer.Header>
            <PMDrawer.Body paddingX={1} paddingY={2}>
              {space.sections.map((section, sectionIdx) => (
                <PMBox
                  key={section.heading ?? 'root'}
                  mt={sectionIdx > 0 ? 2 : 0}
                >
                  {section.heading && (
                    <PMBox
                      paddingLeft={3}
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
                        pl={3}
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
                            fontSize="sm"
                            flexShrink={0}
                            color={
                              isItemActive ? 'text.primary' : 'text.tertiary'
                            }
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
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
