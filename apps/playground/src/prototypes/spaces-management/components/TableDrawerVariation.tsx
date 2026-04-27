import { useCallback, useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
  PMIcon,
  PMPortal,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuEllipsis } from 'react-icons/lu';
import { getAdmins, type DrawerTab, type Space } from '../types';
import { STUB_SPACES } from '../data';
import { AvatarStack } from './shared/AvatarStack';
import { SpaceEditForm } from './SpaceEditForm';
import { MemberManagementPanel } from './MemberManagementPanel';
import { DangerZone } from './DangerZone';

type TableDrawerVariationProps = {
  density: 'comfortable' | 'compact';
  showBulk: boolean;
  initialTab: DrawerTab;
};

export function TableDrawerVariation({
  density,
  showBulk,
  initialTab,
}: Readonly<TableDrawerVariationProps>) {
  const [selectedId, setSelectedId] = useState<string | null>('frontend');
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['backend', 'mobile']),
  );

  // Keep the drawer tab in sync when parent toggles it
  useMemo(() => setActiveTab(initialTab), [initialTab]);

  const openSpace = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab('general');
  }, []);

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const selectedSpace = STUB_SPACES.find((s) => s.id === selectedId) ?? null;

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <PMVStack gap={3} align="stretch">
      {showBulk && selected.size > 0 && (
        <PMHStack
          gap={3}
          align="center"
          paddingX={3}
          paddingY={2}
          bg="background.tertiary"
          borderRadius="md"
        >
          <PMText fontSize="xs" fontWeight="semibold" color="primary">
            {selected.size} selected
          </PMText>
          <PMText fontSize="xs" color="faded">
            &middot;
          </PMText>
          <PMButton variant="danger" size="xs">
            Delete
          </PMButton>
          <PMBox flex={1} />
          <PMBox
            as="button"
            fontSize="xs"
            color="text.faded"
            bg="transparent"
            border="none"
            cursor="pointer"
            _hover={{ color: 'text.primary' }}
            onClick={() => setSelected(new Set())}
          >
            clear
          </PMBox>
        </PMHStack>
      )}

      <PMBox
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={4}
      >
        <PMVStack gap={4} align="stretch">
          <PMBox
            borderWidth="1px"
            borderColor="border.tertiary"
            borderRadius="md"
            overflow="hidden"
          >
            <SpacesTable
              spaces={STUB_SPACES}
              density={density}
              showBulk={showBulk}
              selectedId={selectedId}
              selectedRows={selected}
              onOpenRow={openSpace}
              onToggleRow={toggleSelect}
            />
          </PMBox>

          <PMHStack gap={3} align="center" justify="space-between">
            <PMText fontSize="xs" color="faded">
              Showing 1&ndash;8 of 32
            </PMText>
            <PMHStack gap={1}>
              {['\u2039', '1', '2', '3', '4', '\u203a'].map((n, i) => (
                <PMBox
                  key={`${n}-${i}`}
                  as="button"
                  paddingX={2}
                  paddingY={0.5}
                  fontSize="xs"
                  borderRadius="sm"
                  border="1px solid"
                  borderColor="border.tertiary"
                  bg={n === '1' ? 'background.tertiary' : 'transparent'}
                  color={n === '1' ? 'text.primary' : 'text.secondary'}
                  cursor="pointer"
                  _hover={{ bg: 'background.tertiary' }}
                >
                  {n}
                </PMBox>
              ))}
            </PMHStack>
          </PMHStack>
        </PMVStack>
      </PMBox>

      <PMDrawer.Root
        open={!!selectedSpace}
        onOpenChange={(e) => {
          if (!e.open) closeDrawer();
        }}
        placement="end"
        size="md"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              {selectedSpace && (
                <>
                  <PMDrawer.Header
                    borderBottom="1px solid"
                    borderColor="border.tertiary"
                  >
                    <PMHStack gap={3} align="center" flex={1}>
                      <PMVStack gap={0.5} align="start" flex={1} minW={0}>
                        <PMHStack gap={2} align="center">
                          <PMStatus.Root as="span">
                            <PMStatus.Indicator bg={selectedSpace.color} />
                          </PMStatus.Root>
                          <PMHeading size="md">{selectedSpace.name}</PMHeading>
                        </PMHStack>
                        <PMText fontSize="xs" color="faded">
                          Created {selectedSpace.created} &middot;{' '}
                          {selectedSpace.memberCount} members &middot;{' '}
                          {selectedSpace.artifactCount} artifacts
                        </PMText>
                      </PMVStack>
                    </PMHStack>
                  </PMDrawer.Header>
                  <PMBox
                    borderBottom="1px solid"
                    borderColor="border.tertiary"
                    paddingX={5}
                  >
                    <PMHStack gap={1}>
                      {(
                        [
                          { id: 'general', label: 'General' },
                          { id: 'members', label: 'Members' },
                          { id: 'danger', label: 'Danger' },
                        ] as const
                      ).map((t) => {
                        const active = t.id === activeTab;
                        return (
                          <PMBox
                            key={t.id}
                            as="button"
                            paddingY={2}
                            paddingX={3}
                            fontSize="sm"
                            fontWeight={active ? 'semibold' : 'normal'}
                            color={active ? 'text.primary' : 'text.secondary'}
                            bg="transparent"
                            border="none"
                            cursor="pointer"
                            borderBottom="2px solid"
                            borderBottomColor={
                              active ? 'branding.primary' : 'transparent'
                            }
                            marginBottom="-1px"
                            _hover={{ color: 'text.primary' }}
                            onClick={() => setActiveTab(t.id)}
                          >
                            {t.label}
                          </PMBox>
                        );
                      })}
                    </PMHStack>
                  </PMBox>

                  <PMDrawer.Body padding={5}>
                    {activeTab === 'general' && (
                      <SpaceEditForm
                        space={selectedSpace}
                        onGoToMembersTab={() => setActiveTab('members')}
                      />
                    )}
                    {activeTab === 'members' && (
                      <MemberManagementPanel
                        members={selectedSpace.members}
                        totalCount={selectedSpace.memberCount}
                        density={density}
                      />
                    )}
                    {activeTab === 'danger' && (
                      <DangerZone space={selectedSpace} />
                    )}
                  </PMDrawer.Body>

                  <PMBox
                    borderTop="1px solid"
                    borderColor="border.tertiary"
                    paddingX={5}
                    paddingY={3}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <PMText fontSize="xs" color="faded">
                      Autosaved 2 min ago
                    </PMText>
                    <PMButton variant="primary" size="sm">
                      Save changes
                    </PMButton>
                  </PMBox>

                  <PMDrawer.CloseTrigger asChild>
                    <PMCloseButton size="sm" />
                  </PMDrawer.CloseTrigger>
                </>
              )}
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
    </PMVStack>
  );
}

type SpacesTableProps = {
  spaces: Space[];
  density: 'comfortable' | 'compact';
  showBulk: boolean;
  selectedId: string | null;
  selectedRows: Set<string>;
  onOpenRow: (id: string) => void;
  onToggleRow: (id: string) => void;
};

function SpacesTable({
  spaces,
  density,
  showBulk,
  selectedId,
  selectedRows,
  onOpenRow,
  onToggleRow,
}: Readonly<SpacesTableProps>) {
  const rowPadY = density === 'compact' ? 2 : 3;
  return (
    <PMBox>
      <PMHStack
        gap={3}
        paddingX={4}
        paddingY={2}
        bg="background.secondary"
        borderBottom="1px solid"
        borderColor="border.tertiary"
        fontSize="10px"
        color="text.faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {showBulk && <PMBox width="18px" />}
        <PMBox flex={1} minW={0}>
          Name
        </PMBox>
        <PMBox width="180px">Admins</PMBox>
        <PMBox width="80px" textAlign="right">
          Members
        </PMBox>
        <PMBox width="80px" textAlign="right">
          Artifacts
        </PMBox>
        <PMBox width="110px">Created</PMBox>
        <PMBox width="22px" />
      </PMHStack>
      {spaces.map((s) => {
        const isSelected = s.id === selectedId;
        return (
          <PMHStack
            key={s.id}
            gap={3}
            paddingX={4}
            paddingY={rowPadY}
            borderBottom="1px solid"
            borderColor="border.tertiary"
            bg={isSelected ? 'blue.900' : 'transparent'}
            cursor="pointer"
            _hover={isSelected ? undefined : { bg: 'background.secondary' }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, button')) return;
              onOpenRow(s.id);
            }}
          >
            {showBulk && (
              <input
                type="checkbox"
                checked={selectedRows.has(s.id)}
                onChange={() => onToggleRow(s.id)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--pm-colors-branding-primary)',
                  cursor: 'pointer',
                }}
              />
            )}
            <PMHStack gap={2} flex={1} minW={0} align="center">
              <PMStatus.Root as="span">
                <PMStatus.Indicator bg={s.color} />
              </PMStatus.Root>
              <PMText fontSize="sm" fontWeight="semibold" color="primary">
                {s.name}
              </PMText>
              {s.isOrgWide && (
                <PMBadge variant="outline" size="xs" colorPalette="gray">
                  org-wide
                </PMBadge>
              )}
            </PMHStack>
            <PMHStack gap={2} width="180px" align="center">
              <AdminsCell space={s} />
            </PMHStack>
            <PMText
              fontSize="sm"
              color="secondary"
              width="80px"
              textAlign="right"
              fontVariantNumeric="tabular-nums"
            >
              {s.memberCount}
            </PMText>
            <PMText
              fontSize="sm"
              color="secondary"
              width="80px"
              textAlign="right"
              fontVariantNumeric="tabular-nums"
            >
              {s.artifactCount}
            </PMText>
            <PMText fontSize="xs" color="faded" width="110px">
              {s.created}
            </PMText>
            <PMBox
              as="button"
              width="22px"
              aria-label={`More actions for ${s.name}`}
              bg="transparent"
              border="none"
              color="text.faded"
              cursor="pointer"
              padding={0}
              _hover={{ color: 'text.primary' }}
            >
              <PMIcon fontSize="sm">
                <LuEllipsis />
              </PMIcon>
            </PMBox>
          </PMHStack>
        );
      })}
    </PMBox>
  );
}

function AdminsCell({ space }: Readonly<{ space: Space }>) {
  const admins = getAdmins(space);
  const extra = Math.max(0, space.adminCount - admins.length);
  return (
    <PMHStack gap={2} align="center" minW={0}>
      <AvatarStack members={admins} max={3} extraCount={extra} />
      {admins.length === 1 ? (
        <PMText fontSize="xs" color="secondary" truncate>
          {admins[0].name}
        </PMText>
      ) : (
        <PMText fontSize="xs" color="faded">
          {space.adminCount} admin{space.adminCount === 1 ? '' : 's'}
        </PMText>
      )}
    </PMHStack>
  );
}
