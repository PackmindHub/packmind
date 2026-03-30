import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMText,
  PMBadge,
} from '@packmind/ui';
import { LuHistory, LuPencil, LuTrash2 } from 'react-icons/lu';
import { MockStandard } from '../types';

type StandardHeaderProps = {
  standard: MockStandard;
};

export function StandardHeader({ standard }: StandardHeaderProps) {
  return (
    <PMBox>
      <PMHStack justify="space-between" align="start" gap={4} mb={1}>
        <PMHStack gap={3} align="center" flexWrap="wrap">
          <PMText fontSize="xs" color="secondary">
            Last updated: {standard.lastUpdated}
          </PMText>
          <PMHStack gap={1} align="center">
            <PMText fontSize="xs" color="secondary">
              Version: {standard.version}
            </PMText>
            <PMButton variant="plain" size="xs" color="secondary" padding={0}>
              <LuHistory />
              History
            </PMButton>
          </PMHStack>
          <PMText fontSize="xs" color="secondary">
            Package:{' '}
            <PMBadge variant="outline" size="xs">
              {standard.packageName}
            </PMBadge>
          </PMText>
        </PMHStack>

        <PMHStack gap={2} flexShrink={0}>
          <PMButton variant="outline" size="sm">
            <LuPencil />
            Edit
          </PMButton>
          <PMButton variant="ghost" size="sm" colorPalette="red">
            <LuTrash2 />
            Delete
          </PMButton>
        </PMHStack>
      </PMHStack>

      <PMHeading size="xl" mb={4}>
        {standard.name}
      </PMHeading>
    </PMBox>
  );
}
