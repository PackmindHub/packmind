import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { IconType } from 'react-icons';
import {
  LuBookCheck,
  LuPackage,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { formatRelativeDate } from '../../redesign/selectors/installDriftEntries';
import { getSpaceColorPalette } from '../../../../organizations/components/sidebar/SpaceNavBlock';
import { UserAvatarWithInitials } from '../../../../accounts/components/UserAvatarWithInitials';
import type { ActivityEntry, ActivitySubjectType } from './stubActivityEntries';

interface GovernanceActivityRowProps {
  entry: ActivityEntry;
}

const SUBJECT_TYPE_ICON: Record<ActivitySubjectType, IconType> = {
  package: LuPackage,
  standard: LuBookCheck,
  command: LuTerminal,
  skill: LuWandSparkles,
};

export function GovernanceActivityRow({
  entry,
}: Readonly<GovernanceActivityRowProps>) {
  const colorPalette = getSpaceColorPalette(entry.spaceName);
  const SubjectIcon = SUBJECT_TYPE_ICON[entry.subjectType];

  return (
    <PMHStack gap={3} align="center" paddingY={2} width="full">
      <PMBox flexShrink={0}>
        <UserAvatarWithInitials displayName={entry.actor} size="xs" />
      </PMBox>
      <PMVStack align="stretch" gap={1} flex={1} minW={0}>
        <PMHStack gap={2} align="baseline" justify="space-between" width="full">
          <PMText
            fontSize="xs"
            color="primary"
            fontWeight="medium"
            truncate
            minW={0}
          >
            {entry.actor}
          </PMText>
          <PMText
            fontSize="xs"
            color="tertiary"
            fontVariantNumeric="tabular-nums"
            flexShrink={0}
          >
            {formatRelativeDate(entry.occurredAt)}
          </PMText>
        </PMHStack>
        <PMHStack gap={2} align="center" wrap="wrap" rowGap={1.5} minW={0}>
          <PMHStack gap={1.5} align="center" minW={0} flexShrink={1}>
            <PMIcon
              as="span"
              display="inline-flex"
              alignItems="center"
              color="secondary"
              flexShrink={0}
              aria-hidden
            >
              <SubjectIcon />
            </PMIcon>
            <PMText
              fontSize="xs"
              color="secondary"
              lineHeight="1.5"
              wordBreak="break-word"
              minW={0}
            >
              <PMText as="span" color="primary" fontWeight="medium">
                {entry.subject}
              </PMText>{' '}
              {entry.detail}
            </PMText>
          </PMHStack>
          <PMBadge
            variant="subtle"
            size="xs"
            borderRadius="full"
            paddingX={2}
            gap={1.5}
            alignItems="center"
            display="inline-flex"
            flexShrink={0}
          >
            <PMStatus.Root
              colorPalette={colorPalette}
              as="span"
              display="inline-flex"
              alignItems="center"
            >
              <PMStatus.Indicator />
            </PMStatus.Root>
            {entry.spaceName}
          </PMBadge>
        </PMHStack>
      </PMVStack>
    </PMHStack>
  );
}
