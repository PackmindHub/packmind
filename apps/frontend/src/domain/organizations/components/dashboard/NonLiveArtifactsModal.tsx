import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  PMDialog,
  PMTabs,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMLink,
  PMPortal,
  PMBox,
  PMHeading,
  PMCloseButton,
  PMText,
} from '@packmind/ui';
import { useGetDashboardNonLiveQuery } from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetSpacesQuery } from '../../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../../shared/utils/routes';

export type ArtifactTab = 'standards' | 'commands' | 'skills';

interface NonLiveArtifactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ArtifactTab;
}

export const NonLiveArtifactsModal = ({
  open,
  onOpenChange,
  defaultTab = 'standards',
}: NonLiveArtifactsModalProps) => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const [activeTab, setActiveTab] = useState<ArtifactTab>(defaultTab);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const { spaceId } = useCurrentSpace();
  const { data: spaces } = useGetSpacesQuery();
  const defaultSpaceSlug = spaces?.[0]?.slug;
  const effectiveSpaceSlug = spaceSlug || defaultSpaceSlug;

  const { data: nonLiveData } = useGetDashboardNonLiveQuery(
    spaceId ?? '',
    open,
  );

  const nonLiveStandards = nonLiveData?.standards ?? [];
  const nonLiveRecipes = nonLiveData?.recipes ?? [];
  const nonLiveSkills = nonLiveData?.skills ?? [];

  const standardColumns: PMTableColumn[] = [
    {
      key: 'name',
      header: 'Name',
      align: 'left',
      grow: true,
    },
  ];

  const commandColumns: PMTableColumn[] = [
    {
      key: 'name',
      header: 'Name',
      align: 'left',
      grow: true,
    },
  ];

  const skillColumns: PMTableColumn[] = [
    {
      key: 'name',
      header: 'Name',
      align: 'left',
      grow: true,
    },
  ];

  const standardRows: PMTableRow[] = nonLiveStandards.map((item) => ({
    key: item.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toStandard(orgSlug, effectiveSpaceSlug, item.id)}
          >
            {item.name}
          </Link>
        </PMLink>
      ) : (
        item.name
      ),
  }));

  const commandRows: PMTableRow[] = nonLiveRecipes.map((item) => ({
    key: item.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toCommand(orgSlug, effectiveSpaceSlug, item.id)}
          >
            {item.name}
          </Link>
        </PMLink>
      ) : (
        item.name
      ),
  }));

  const skillRows: PMTableRow[] = nonLiveSkills.map((item) => ({
    key: item.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toSkill(orgSlug, effectiveSpaceSlug, item.slug)}
          >
            {item.name}
          </Link>
        </PMLink>
      ) : (
        item.name
      ),
  }));

  const tabs = [
    {
      value: 'standards',
      triggerLabel: `Standards (${nonLiveStandards.length})`,
      content: (
        <PMBox mt={4}>
          {standardRows.length === 0 ? (
            <PMText as="p" color="secondary">
              All standards are distributed to at least one target.
            </PMText>
          ) : (
            <PMTable
              columns={standardColumns}
              data={standardRows}
              tableProps={{
                border: 'solid 1px',
                borderColor: 'border.tertiary',
              }}
            />
          )}
        </PMBox>
      ),
    },
    {
      value: 'commands',
      triggerLabel: `Commands (${nonLiveRecipes.length})`,
      content: (
        <PMBox mt={4}>
          {commandRows.length === 0 ? (
            <PMText color="faded">
              All commands are distributed to at least one target.
            </PMText>
          ) : (
            <PMTable columns={commandColumns} data={commandRows} />
          )}
        </PMBox>
      ),
    },
    {
      value: 'skills',
      triggerLabel: `Skills (${nonLiveSkills.length})`,
      content: (
        <PMBox mt={4}>
          {skillRows.length === 0 ? (
            <PMText color="faded">
              All skills are distributed to at least one target.
            </PMText>
          ) : (
            <PMTable columns={skillColumns} data={skillRows} />
          )}
        </PMBox>
      ),
    },
  ];

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="xl"
      placement="center"
      scrollBehavior="inside"
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title asChild>
                <PMHeading level="h3">Non-distributed Artifacts</PMHeading>
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText as="p" mb={4} color="secondary">
                These artifacts are not currently included in any package
                distributed to target repositories.
              </PMText>
              <PMTabs
                defaultValue={activeTab}
                value={activeTab}
                tabs={tabs}
                onValueChange={(details) =>
                  setActiveTab(details.value as ArtifactTab)
                }
              />
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
