import { useState } from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMHStack,
  PMBox,
  PMSeparator,
} from '@packmind/ui';
import { Grid } from '@chakra-ui/react';
import { LuHouse, LuWrench, LuSettings } from 'react-icons/lu';
import { ReviewMode, ProposalStatus } from './types';
import { STUB_GROUPS } from './data';
import { ReviewChangesSidebarPanel } from './components/change-proposals/ReviewChangesSidebarPanel';
import { GroupDetailPanel } from './components/change-proposals/GroupDetailPanel';
import { ArtefactDetailPanel } from './components/change-proposals/ArtefactDetailPanel';
import { AppSidebarNavLink } from './components/app-shell/AppSidebarNavLink';
import { StubOrgSelector } from './components/app-shell/StubOrgSelector';
import { StubAccountMenu } from './components/app-shell/StubAccountMenu';
import { StubHelpMenu } from './components/app-shell/StubHelpMenu';

export default function ReviewChangesGroupViewPrototype() {
  const [reviewMode, setReviewMode] = useState<ReviewMode>('group');
  const [selectedGroupId, setSelectedGroupId] = useState(STUB_GROUPS[0].id);
  const [selectedArtefactId, setSelectedArtefactId] = useState<string | null>(
    STUB_GROUPS[0].artefacts[0].id,
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [proposalStatuses, setProposalStatuses] = useState<
    Record<string, ProposalStatus>
  >({});

  const selectedGroup = STUB_GROUPS.find((g) => g.id === selectedGroupId);
  const allArtefacts = STUB_GROUPS.flatMap((g) => g.artefacts);
  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = STUB_GROUPS.find((g) => g.id === groupId);
    setSelectedArtefactId(group?.artefacts[0]?.id ?? null);
  };

  const handleUpdateProposalStatus = (
    proposalId: string,
    status: ProposalStatus,
  ) => {
    setProposalStatuses((prev) => ({ ...prev, [proposalId]: status }));
  };

  return (
    <PMHStack height="100%" gap={0} align="stretch">
      {/* App sidebar */}
      <PMVerticalNav
        headerNav={<StubOrgSelector />}
        footerNav={<StubAccountMenu />}
      >
        <PMVerticalNavSection
          navEntries={[
            <AppSidebarNavLink
              key="dashboard"
              label="Dashboard"
              icon={<LuHouse />}
            />,
          ]}
        />
        <PMVerticalNavSection
          title="Playbook"
          navEntries={[
            <AppSidebarNavLink key="standards" label="Standards" />,
            <AppSidebarNavLink key="commands" label="Commands" />,
            <AppSidebarNavLink key="skills" label="Skills" />,
            <AppSidebarNavLink
              key="review-changes"
              label="Review Changes"
              isActive
            />,
          ]}
        />
        <PMVerticalNavSection
          title="Distribution"
          navEntries={[
            <AppSidebarNavLink key="packages" label="Packages" />,
            <AppSidebarNavLink
              key="overview"
              label="Overview"
              badge={{ text: 'Enterprise', colorScheme: 'purple' }}
            />,
          ]}
        />
        <PMSeparator borderColor="border.tertiary" />
        <PMVerticalNavSection
          navEntries={[
            <AppSidebarNavLink
              key="setup"
              label="Integrations"
              icon={<LuWrench />}
            />,
            <AppSidebarNavLink
              key="settings"
              label="Settings"
              icon={<LuSettings />}
            />,
            <StubHelpMenu key="help" />,
          ]}
        />
      </PMVerticalNav>

      {/* Review changes content */}
      <Grid
        flex="1"
        minHeight={0}
        gridTemplateColumns="minmax(240px, 270px) 1fr minmax(280px, 320px)"
        overflowX="auto"
      >
        {/* Column 1: Review changes sidebar with toggle */}
        <PMBox gridColumn="1" overflowY="auto">
          <ReviewChangesSidebarPanel
            mode={reviewMode}
            onModeChange={setReviewMode}
            groups={STUB_GROUPS}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            selectedArtefactId={selectedArtefactId}
            onSelectArtefact={setSelectedArtefactId}
            selectedFilePath={selectedFilePath}
            onSelectFilePath={setSelectedFilePath}
          />
        </PMBox>

        {/* Columns 2+3: Detail panel (span 2) */}
        {reviewMode === 'group' && selectedGroup && (
          <GroupDetailPanel
            key={selectedGroup.id}
            group={selectedGroup}
            proposalStatuses={proposalStatuses}
            onUpdateStatus={handleUpdateProposalStatus}
          />
        )}
        {reviewMode === 'artifact' && selectedArtefact && (
          <ArtefactDetailPanel
            key={selectedArtefact.id}
            artefact={selectedArtefact}
            proposalStatuses={proposalStatuses}
            onUpdateStatus={handleUpdateProposalStatus}
            fileFilter={selectedFilePath}
          />
        )}
      </Grid>
    </PMHStack>
  );
}
