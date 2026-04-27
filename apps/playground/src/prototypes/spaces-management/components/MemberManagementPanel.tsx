import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlus, LuX } from 'react-icons/lu';
import type { Member } from '../types';
import { MemberAvatar } from './shared/MemberAvatar';

type Density = 'comfortable' | 'compact';

type MemberManagementPanelProps = {
  members: Member[];
  totalCount: number;
  density?: Density;
};

export function MemberManagementPanel({
  members,
  totalCount,
  density = 'comfortable',
}: Readonly<MemberManagementPanelProps>) {
  const rowPadY = density === 'compact' ? 1 : 2;
  return (
    <PMVStack gap={2} align="stretch">
      <PMHStack gap={2} align="center" justify="space-between">
        <PMText fontSize="xs" color="faded">
          {totalCount} members
        </PMText>
        <PMButton variant="secondary" size="xs">
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          Add
        </PMButton>
      </PMHStack>
      <PMVStack
        gap={0}
        align="stretch"
        divideY="1px"
        divideColor="border.tertiary"
      >
        {members.map((m) => (
          <PMHStack
            key={m.id}
            gap={3}
            align="center"
            paddingY={rowPadY}
            _first={{ paddingTop: 0 }}
          >
            <MemberAvatar initials={m.initials} color={m.color} size="sm" />
            <PMText
              fontSize="sm"
              fontWeight="medium"
              color="primary"
              flex={1}
              truncate
            >
              {m.name}
            </PMText>
            <PMBox
              as="select"
              defaultValue={m.role}
              bg="background.tertiary"
              border="1px solid"
              borderColor="border.tertiary"
              borderRadius="sm"
              paddingX={2}
              paddingY={1}
              fontSize="xs"
              color="text.secondary"
              cursor="pointer"
              _focus={{ outline: 'none', borderColor: 'branding.primary' }}
            >
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
            </PMBox>
            <PMBox
              as="button"
              aria-label={`Remove ${m.name}`}
              color="text.faded"
              bg="transparent"
              border="none"
              cursor="pointer"
              padding={1}
              borderRadius="sm"
              _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            >
              <PMIcon fontSize="xs">
                <LuX />
              </PMIcon>
            </PMBox>
          </PMHStack>
        ))}
      </PMVStack>
    </PMVStack>
  );
}
