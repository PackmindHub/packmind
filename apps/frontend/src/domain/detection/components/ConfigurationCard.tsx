import {
  PMBadge,
  PMBox,
  PMEllipsisMenu,
  PMEllipsisMenuAction,
  PMHeading,
  PMHStack,
  PMVStack,
} from '@packmind/ui';
import { getLanguageDisplayName } from './DetectionCardUtils';
import React, { PropsWithChildren } from 'react';

export type ConfigurationCardProps = PropsWithChildren<{
  id: string;
  language: string | null;
  badge?: {
    label: string;
    colorPalette: string;
  };
  mainAction?: React.ReactNode;
  menuActions: PMEllipsisMenuAction[];
  actionsDisabled: boolean;
}>;

export const ConfigurationCard: React.FunctionComponent<
  ConfigurationCardProps
> = (props) => (
  <PMBox key={props.id} flex="1 1 280px" minWidth="280px" maxWidth="420px">
    <PMBox
      border="1px solid"
      borderColor="border.tertiary"
      borderRadius="lg"
      p={4}
      backgroundColor="background.primary"
      height="full"
    >
      <PMVStack
        alignItems="stretch"
        gap={4}
        width="full"
        height="full"
        justifyContent="space-between"
      >
        <PMVStack alignItems="flex-start" gap={2} width="full">
          <PMHStack
            width="full"
            justifyContent="space-between"
            alignItems="center"
          >
            <PMHeading size="sm">
              {getLanguageDisplayName(props.language)}
            </PMHeading>
            <PMHStack gap={2}>
              {props.badge && (
                <PMBadge colorPalette={props.badge.colorPalette}>
                  {props.badge.label}
                </PMBadge>
              )}
              {props.menuActions.length > 0 && (
                <PMEllipsisMenu
                  title="Draft actions"
                  actions={props.menuActions}
                  disabled={props.actionsDisabled}
                />
              )}
            </PMHStack>
          </PMHStack>
        </PMVStack>
        <PMHStack
          alignItems="center"
          gap={4}
          justifyContent={props.mainAction ? 'space-between' : 'flex-start'}
          width="full"
        >
          <PMVStack alignItems="flex-start" gap={2}>
            {props.children}
          </PMVStack>
          {props.mainAction ? <PMBox>{props.mainAction}</PMBox> : null}
        </PMHStack>
      </PMVStack>
    </PMBox>
  </PMBox>
);
