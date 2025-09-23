import React from 'react';
import { PMBadge, PMButton, PMHStack, PMIcon, PMTooltip } from '@packmind/ui';
import { Target } from '@packmind/shared';
import { LuPencil, LuX } from 'react-icons/lu';

interface TargetBadgeProps {
  target: Target;
  branch?: string;
  variant?: 'default' | 'subtle';
  clickable?: boolean;
  showActions?: boolean;
  showEditAction?: boolean;
  onEdit?: (target: Target) => void;
  onDelete?: (target: Target) => void;
  onClick?: (target: Target) => void;
}

export const TargetBadge: React.FC<TargetBadgeProps> = ({
  target,
  branch,
  variant = 'default',
  clickable = false,
  showActions = false,
  showEditAction = true,
  onEdit,
  onDelete,
  onClick,
}) => {
  const isRootTarget = target.path === '/';
  const displayName = branch ? `${target.name}:${branch}` : target.name;

  const handleBadgeClick = () => {
    if (clickable && onClick) {
      onClick(target);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(target);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(target);
    }
  };

  if (showActions) {
    return (
      <PMHStack
        gap={1}
        align="center"
        borderRadius="md"
        border="1px solid"
        borderColor="border.tertiary"
        bg="background.tertiary"
        minHeight="32px" // Ensure consistent height
      >
        <PMTooltip label={`${displayName} - ${target.path}`} placement="top">
          <PMBadge
            colorScheme={variant === 'subtle' ? 'gray' : 'blue'}
            variant={variant === 'subtle' ? 'subtle' : 'solid'}
            size="sm"
            cursor={clickable ? 'pointer' : 'default'}
            onClick={handleBadgeClick}
          >
            {displayName}
          </PMBadge>
        </PMTooltip>

        {!isRootTarget && (
          <PMHStack gap={0}>
            {onEdit && showEditAction && (
              <PMButton
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onClick={handleEditClick}
                title="Edit target"
              >
                <PMIcon as={LuPencil} />
              </PMButton>
            )}
            {onDelete && (
              <PMButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={handleDeleteClick}
                title="Delete target"
              >
                <PMIcon as={LuX} />
              </PMButton>
            )}
          </PMHStack>
        )}
      </PMHStack>
    );
  }

  return (
    <PMTooltip
      label={clickable ? `${displayName} - ${target.path}` : target.path}
      placement="top"
    >
      <PMBadge
        colorScheme={variant === 'subtle' ? 'gray' : 'blue'}
        variant={variant === 'subtle' ? 'subtle' : 'solid'}
        size="sm"
        cursor={clickable ? 'pointer' : 'default'}
        onClick={handleBadgeClick}
      >
        {displayName}
      </PMBadge>
    </PMTooltip>
  );
};
