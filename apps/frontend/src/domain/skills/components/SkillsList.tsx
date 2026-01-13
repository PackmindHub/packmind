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
import { formatDistanceToNowStrict } from 'date-fns';

import { useGetSkillsQuery } from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';

interface ISkillsListProps {
  orgSlug: string;
}

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
        updatedAt: (
          <>
            {formatDistanceToNowStrict(skill.updatedAt || new Date(), {
              addSuffix: true,
            })}
          </>
        ),
        version: skill.version,
      })),
    );
  }, [skills, orgSlug, spaceSlug]);

  const columns: PMTableColumn[] = [
    { key: 'name', header: 'Name', grow: true },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: '250px',
      align: 'center',
    },
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
            Skills are reusable prompts that can be invoked by AI coding
            assistants. Create skills via the CLI using the command
            "packmind-cli skill add"
          </PMEmptyState>
        )
      )}
    </div>
  );
};
