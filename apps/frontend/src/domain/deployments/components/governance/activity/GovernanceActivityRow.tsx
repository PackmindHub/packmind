import { PMBox, PMHStack, PMStatus, PMText } from '@packmind/ui';
import { formatRelativeDate } from '../../redesign/selectors/installDriftEntries';
import { getSpaceColorPalette } from '../../../../organizations/components/sidebar/SpaceNavBlock';
import type { ActivityEntry } from './stubActivityEntries';

interface GovernanceActivityRowProps {
  entry: ActivityEntry;
}

export function GovernanceActivityRow({
  entry,
}: Readonly<GovernanceActivityRowProps>) {
  const colorPalette = getSpaceColorPalette(entry.spaceName);

  return (
    <PMHStack
      gap={3}
      align="baseline"
      justify="space-between"
      paddingY={1.5}
      width="full"
    >
      <PMHStack gap={2} align="baseline" minW={0} flex={1}>
        <PMBox flexShrink={0} alignSelf="center">
          <PMStatus.Root colorPalette={colorPalette} as="span">
            <PMStatus.Indicator />
          </PMStatus.Root>
        </PMBox>
        <PMText
          fontSize="xs"
          color="secondary"
          truncate
          flexShrink={1}
          minW={0}
        >
          <PMText as="span" color="primary" fontWeight="medium">
            {entry.actor}
          </PMText>
          {' · '}
          <PMText as="span" color="primary" fontWeight="medium">
            {entry.subject}
          </PMText>{' '}
          {entry.detail}
          {' · '}
          <PMText as="span" color="tertiary">
            {entry.spaceName}
          </PMText>
        </PMText>
      </PMHStack>
      <PMText
        fontSize="xs"
        color="faded"
        fontVariantNumeric="tabular-nums"
        flexShrink={0}
      >
        {formatRelativeDate(entry.occurredAt)}
      </PMText>
    </PMHStack>
  );
}
