import React, { useMemo } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMHStack,
  PMText,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';

import { useGetSkillsQuery } from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';

interface ISkillsListProps {
  orgSlug: string;
}

export const SkillsList = ({ orgSlug }: ISkillsListProps) => {
  const { spaceSlug } = useCurrentSpace();
  const { data: skills, isLoading, isError } = useGetSkillsQuery();

  const columns: PMTableColumn[] = useMemo(
    () => [
      { key: 'name', header: 'Name', grow: true },
      {
        key: 'updatedAt',
        header: 'Last Updated',
        width: '250px',
        align: 'center',
      },
      { key: 'version', header: 'Version', width: '100px', align: 'center' },
    ],
    [],
  );

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!skills) return [];

    return skills.map((skill) => ({
      key: skill.id,
      name: (
        <PMLink asChild>
          <Link
            to={
              spaceSlug
                ? routes.space.toSkill(orgSlug, spaceSlug, skill.slug)
                : '#'
            }
          >
            {skill.name}
          </Link>
        </PMLink>
      ),
      updatedAt: formatDistanceToNowStrict(skill.updatedAt || new Date(), {
        addSuffix: true,
      }),
      version: skill.version,
    }));
  }, [skills, orgSlug, spaceSlug]);

  if (isLoading) return <PMText>Loading...</PMText>;
  if (isError) return <PMText color="error">Error loading skills.</PMText>;

  if (!skills?.length) {
    return (
      <PMEmptyState
        backgroundColor="background.primary"
        borderRadius="md"
        width="2xl"
        mx="auto"
        title="No skills yet"
      >
        Skills are reusable prompts that can be invoked by AI coding assistants.
        Create skills via the CLI using the command "packmind-cli skill add"
        <PMHStack>
          <GettingStartedLearnMoreDialog
            body={<SkillsLearnMoreContent />}
            title="How to create skills"
            buttonLabel="Learn how to create skills"
            buttonSize="sm"
          />
        </PMHStack>
      </PMEmptyState>
    );
  }

  return (
    <PMBox>
      <PMTable
        columns={columns}
        data={tableData}
        striped
        hoverable
        size="md"
        variant="line"
      />
    </PMBox>
  );
};
