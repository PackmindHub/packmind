import { PMBox, PMHStack } from '@packmind/ui';
import type { Member } from '../../types';
import { MemberAvatar } from './MemberAvatar';

type AvatarStackProps = {
  members: Member[];
  extraCount?: number;
  max?: number;
};

export function AvatarStack({
  members,
  extraCount = 0,
  max = 3,
}: Readonly<AvatarStackProps>) {
  const visible = members.slice(0, max);
  return (
    <PMHStack gap={0}>
      {visible.map((m, i) => (
        <PMBox
          key={m.id}
          marginLeft={i === 0 ? 0 : '-6px'}
          borderRadius="999px"
          border="2px solid"
          borderColor="background.primary"
        >
          <MemberAvatar initials={m.initials} color={m.color} size="xs" />
        </PMBox>
      ))}
      {extraCount > 0 && (
        <PMBox
          marginLeft="-6px"
          borderRadius="999px"
          border="2px solid"
          borderColor="background.primary"
          width="18px"
          height="18px"
          bg="background.tertiary"
          color="text.secondary"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          fontSize="9px"
          fontWeight="semibold"
        >
          +{extraCount}
        </PMBox>
      )}
    </PMHStack>
  );
}
