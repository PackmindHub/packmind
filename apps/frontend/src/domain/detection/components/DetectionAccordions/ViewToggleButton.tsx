import React from 'react';
import { PMBox, PMIcon } from '@packmind/ui';
import { LuFileCheck, LuFilePen } from 'react-icons/lu';

interface ViewToggleButtonProps {
  mode: 'active' | 'draft';
  onToggle: () => void;
  showDraft: boolean;
}

export const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({
  mode,
  onToggle,
  showDraft,
}) => {
  if (!showDraft) {
    return null;
  }

  const config = {
    active: {
      icon: LuFileCheck,
      text: 'Active',
      colorPalette: 'gray' as const,
    },
    draft: {
      icon: LuFilePen,
      text: 'Draft',
      colorPalette: 'blue' as const,
    },
  };

  const current = config[mode];

  return (
    <PMBox
      as="button"
      backgroundColor={`${current.colorPalette}.subtle`}
      color={`${current.colorPalette}.fg`}
      px={2}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      gap={1}
      border="1px solid"
      borderColor={`${current.colorPalette}.emphasized`}
      _hover={{
        backgroundColor: `${current.colorPalette}.emphasized`,
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <PMIcon size="xs">
        <current.icon />
      </PMIcon>
      {current.text}
    </PMBox>
  );
};
