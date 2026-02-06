import { useState } from 'react';
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
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
  useGetSkillsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { useGetSpacesQuery } from '../../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../../shared/utils/routes';

interface NonLiveArtifactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NonLiveArtifactsModal = ({
  open,
  onOpenChange,
}: NonLiveArtifactsModalProps) => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const [activeTab, setActiveTab] = useState('standards');

  const { data: spaces } = useGetSpacesQuery();
  const defaultSpaceSlug = spaces?.[0]?.slug;
  const effectiveSpaceSlug = spaceSlug || defaultSpaceSlug;

  const { data: recipesOverview } = useGetRecipesDeploymentOverviewQuery();
  const { data: standardsOverview } = useGetStandardsDeploymentOverviewQuery();
  const { data: skillsOverview } = useGetSkillsDeploymentOverviewQuery();

  const nonLiveStandards =
    standardsOverview?.standards
      .filter((s) => s.targetDeployments.length === 0)
      .sort((a, b) => a.standard.name.localeCompare(b.standard.name)) ?? [];

  const nonLiveRecipes =
    recipesOverview?.recipes
      .filter((r) => r.targetDeployments.length === 0)
      .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name)) ?? [];

  const nonLiveSkills =
    skillsOverview?.skills
      .filter((s) => s.targetDeployments.length === 0)
      .sort((a, b) => a.skill.name.localeCompare(b.skill.name)) ?? [];

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
    key: item.standard.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toStandard(
              orgSlug,
              effectiveSpaceSlug,
              item.standard.id,
            )}
          >
            {item.standard.name}
          </Link>
        </PMLink>
      ) : (
        item.standard.name
      ),
  }));

  const commandRows: PMTableRow[] = nonLiveRecipes.map((item) => ({
    key: item.recipe.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toCommand(
              orgSlug,
              effectiveSpaceSlug,
              item.recipe.id,
            )}
          >
            {item.recipe.name}
          </Link>
        </PMLink>
      ) : (
        item.recipe.name
      ),
  }));

  const skillRows: PMTableRow[] = nonLiveSkills.map((item) => ({
    key: item.skill.id,
    name:
      orgSlug && effectiveSpaceSlug ? (
        <PMLink asChild>
          <Link
            to={routes.space.toSkill(
              orgSlug,
              effectiveSpaceSlug,
              item.skill.slug,
            )}
          >
            {item.skill.name}
          </Link>
        </PMLink>
      ) : (
        item.skill.name
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
                tabs={tabs}
                onValueChange={(details) => setActiveTab(details.value)}
              />
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
