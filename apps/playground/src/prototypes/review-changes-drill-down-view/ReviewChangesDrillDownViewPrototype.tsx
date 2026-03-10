import { useState, useCallback } from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMHStack,
  PMBox,
  PMSeparator,
} from '@packmind/ui';
import { Grid } from '@chakra-ui/react';
import { LuHouse, LuWrench, LuSettings } from 'react-icons/lu';
import { ProposalStatus } from '../review-changes-group-view/types';
import { STUB_GROUPS } from '../review-changes-group-view/data';
import { ArtefactDetailPanel } from '../review-changes-group-view/components/change-proposals/ArtefactDetailPanel';
import { AppSidebarNavLink } from '../review-changes-group-view/components/app-shell/AppSidebarNavLink';
import { StubOrgSelector } from '../review-changes-group-view/components/app-shell/StubOrgSelector';
import { StubAccountMenu } from '../review-changes-group-view/components/app-shell/StubAccountMenu';
import { StubHelpMenu } from '../review-changes-group-view/components/app-shell/StubHelpMenu';
import {
  DrillDownSidebarPanel,
  SidebarView,
} from './components/change-proposals/DrillDownSidebarPanel';

export default function ReviewChangesDrillDownViewPrototype() {
  const [sidebarView, setSidebarView] = useState<SidebarView>({
    level: 'artifacts',
    groupId: STUB_GROUPS[0].id,
  });
  const [selectedArtefactId, setSelectedArtefactId] = useState<string | null>(
    STUB_GROUPS[0].artefacts[0].id,
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [proposalStatuses, setProposalStatuses] = useState<
    Record<string, ProposalStatus>
  >({});

  const allArtefacts = STUB_GROUPS.flatMap((g) => g.artefacts);
  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );

  const selectedGroup =
    sidebarView.level === 'artifacts'
      ? STUB_GROUPS.find((g) => g.id === sidebarView.groupId)
      : null;

  const handleNavigate = useCallback((view: SidebarView) => {
    setSidebarView(view);
    if (view.level === 'artifacts') {
      const group = STUB_GROUPS.find((g) => g.id === view.groupId);
      setSelectedArtefactId(group?.artefacts[0]?.id ?? null);
      setSelectedFilePath(null);
    } else if (view.level === 'all-artifacts') {
      const allArt = STUB_GROUPS.flatMap((g) => g.artefacts);
      setSelectedArtefactId(allArt[0]?.id ?? null);
      setSelectedFilePath(null);
    } else {
      setSelectedArtefactId(null);
      setSelectedFilePath(null);
    }
  }, []);

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
        {/* Column 1: Drill-down sidebar */}
        <PMBox gridColumn="1" overflowY="auto">
          <DrillDownSidebarPanel
            groups={STUB_GROUPS}
            view={sidebarView}
            onNavigate={handleNavigate}
            selectedArtefactId={selectedArtefactId}
            onSelectArtefact={setSelectedArtefactId}
            selectedFilePath={selectedFilePath}
            onSelectFilePath={setSelectedFilePath}
          />
        </PMBox>

        {/* Columns 2+3: Detail panel (span 2) */}
        {selectedArtefact && (
          <ArtefactDetailPanel
            key={selectedArtefact.id}
            artefact={selectedArtefact}
            proposalStatuses={proposalStatuses}
            onUpdateStatus={handleUpdateProposalStatus}
            fileFilter={selectedFilePath}
            groupContext={
              selectedGroup
                ? {
                    message: selectedGroup.message,
                    author: selectedGroup.author,
                    createdAt: selectedGroup.createdAt,
                  }
                : undefined
            }
          />
        )}
      </Grid>
    </PMHStack>
  );
}
