import React, { ReactNode } from 'react';
import { LuEllipsis } from 'react-icons/lu';
import { PMButton } from '../PMButton/PMButton';
import { PMIcon } from '../../content/PMIcon/PMIcon';
import { PMMenu } from '../PMMenu/PMMenu';
import { PMPortal } from '../../layout/PMPortal/PMPortal';

export type PMEllipsisMenuAction = {
  value: string;
  onClick: () => void | Promise<void>;
  content: ReactNode;
};

export type PMEllipsisMenuProps = {
  title?: string;
  disabled?: boolean;
  actions: PMEllipsisMenuAction[];
};

export const PMEllipsisMenu: React.FC<PMEllipsisMenuProps> = ({
  title = 'Actions',
  disabled = false,
  actions,
}) => {
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          size="sm"
          title={title}
          disabled={disabled}
        >
          <PMIcon>
            <LuEllipsis />
          </PMIcon>
        </PMButton>
      </PMMenu.Trigger>

      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            {actions.map((action) => (
              <PMMenu.Item
                key={action.value}
                value={action.value}
                cursor={'pointer'}
                onClick={action.onClick}
              >
                {action.content}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
