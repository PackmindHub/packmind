import React from 'react';
import { PMIcon, PMTooltip } from '@packmind/ui';
import { RxLockClosed } from 'react-icons/rx';
import { SpaceType } from '@packmind/types';

interface SpaceVisibilityIconProps {
  type: SpaceType;
}

export function SpaceVisibilityIcon({
  type,
}: Readonly<SpaceVisibilityIconProps>): React.ReactElement | null {
  if (type === SpaceType.open) {
    return null;
  }

  return (
    <PMTooltip label="This space is private">
      <PMIcon fontSize="sm" color="text.faded" flexShrink={0} mx={2}>
        <RxLockClosed />
      </PMIcon>
    </PMTooltip>
  );
}
