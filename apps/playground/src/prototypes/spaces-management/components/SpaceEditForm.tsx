import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { getAdmins, type Space } from '../types';
import { MemberAvatar } from './shared/MemberAvatar';
import { WireInput } from './shared/WireInput';

const SPACE_COLORS = [
  '#7c6bd6',
  '#d97706',
  '#3f8f6a',
  '#b45252',
  '#0e7490',
  '#c2410c',
  '#64748b',
  '#a855f7',
];

type SpaceEditFormProps = {
  space: Space;
  onGoToMembersTab?: () => void;
};

function FormLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMText
      fontSize="11px"
      color="faded"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      {children}
    </PMText>
  );
}

export function SpaceEditForm({
  space,
  onGoToMembersTab,
}: Readonly<SpaceEditFormProps>) {
  const admins = getAdmins(space);
  const [color, setColor] = useState(space.color);
  const [name, setName] = useState(space.name);

  return (
    <PMVStack gap={4} align="stretch">
      <PMVStack gap={1.5} align="stretch">
        <FormLabel>Space name</FormLabel>
        <WireInput
          variant="filled"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </PMVStack>

      <PMVStack gap={1.5} align="stretch">
        <FormLabel>Color</FormLabel>
        <PMHStack gap={3} align="center">
          <PMHStack
            gap={2}
            paddingX={3}
            paddingY={1.5}
            bg="background.tertiary"
            border="1px solid"
            borderColor="border.tertiary"
            borderRadius="md"
          >
            <PMStatus.Root as="span">
              <PMStatus.Indicator bg={color} />
            </PMStatus.Root>
            <PMText fontSize="sm" fontWeight="semibold" color="primary">
              {name || space.name}
            </PMText>
          </PMHStack>
          <PMHStack gap={1.5}>
            {SPACE_COLORS.map((c) => {
              const selected = c === color;
              return (
                <PMBox
                  key={c}
                  as="button"
                  aria-label={`Pick color ${c}`}
                  width="22px"
                  height="22px"
                  borderRadius="6px"
                  bg={c}
                  border="2px solid"
                  borderColor={selected ? 'text.primary' : 'transparent'}
                  outline={selected ? '2px solid' : 'none'}
                  outlineColor={selected ? c : 'transparent'}
                  outlineOffset="2px"
                  cursor="pointer"
                  onClick={() => setColor(c)}
                  transition="transform 0.1s"
                  _hover={{ transform: 'scale(1.08)' }}
                />
              );
            })}
          </PMHStack>
        </PMHStack>
        <PMText fontSize="xs" color="faded">
          Shown in the sidebar so your team can spot this space at a glance.
        </PMText>
      </PMVStack>

      <PMVStack gap={1.5} align="stretch">
        <PMHStack gap={2} align="center" justify="space-between">
          <FormLabel>Administrators &middot; {admins.length}</FormLabel>
          <PMButton variant="ghost" size="xs" onClick={onGoToMembersTab}>
            <LuPlus />
            Promote member
          </PMButton>
        </PMHStack>
        <PMVStack
          gap={0}
          align="stretch"
          bg="background.tertiary"
          border="1px solid"
          borderColor="border.tertiary"
          borderRadius="md"
          divideY="1px"
          divideColor="border.tertiary"
        >
          {admins.map((m) => (
            <PMHStack
              key={m.id}
              gap={3}
              align="center"
              paddingX={3}
              paddingY={2}
            >
              <MemberAvatar initials={m.initials} color={m.color} size="sm" />
              <PMText fontSize="sm" fontWeight="medium" color="primary">
                {m.name}
              </PMText>
            </PMHStack>
          ))}
        </PMVStack>
        <PMText fontSize="xs" color="faded">
          Administrators can rename the space, manage members, edit artifacts,
          and delete the space. Promote members from the Members tab.
        </PMText>
      </PMVStack>
    </PMVStack>
  );
}
