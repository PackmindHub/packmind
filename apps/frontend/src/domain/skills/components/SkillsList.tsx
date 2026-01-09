import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
} from '@packmind/ui';

import { useGetSkillsQuery } from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';

interface ISkillsListProps {
  orgSlug: string;
}

const truncateDescription = (description: string, maxLength = 100): string => {
  if (description.length <= maxLength) {
    return description;
  }
  return `${description.slice(0, maxLength)}...`;
};

export const SkillsList = ({ orgSlug }: ISkillsListProps) => {
  const { spaceSlug } = useCurrentSpace();
  const { data: skills, isLoading, isError } = useGetSkillsQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);

  React.useEffect(() => {
    if (!skills) return;

    setTableData(
      skills.map((skill) => ({
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
        description: truncateDescription(skill.description),
        version: skill.version,
      })),
    );
  }, [skills, orgSlug, spaceSlug]);

  const columns: PMTableColumn[] = [
    { key: 'name', header: 'Name', grow: true },
    { key: 'description', header: 'Description', grow: true },
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
  ];

  return (
    <div className="skills-list">
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading skills.</p>}
      {skills?.length ? (
        <PMBox>
          <PMTable
            columns={columns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
          />
        </PMBox>
      ) : (
        !isLoading &&
        !isError && (
          <PMEmptyState
            backgroundColor={'background.primary'}
            borderRadius={'md'}
            width={'2xl'}
            mx={'auto'}
            title={'No skills yet'}
          >
            Skills are reusable AI agent workflows that help automate complex
            development tasks. Create skills via the CLI using the `packmind
            skills push` command.
          </PMEmptyState>
        )
      )}
    </div>
  );
};
