import {
  PMBox,
  PMHStack,
  PMIcon,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { LuFolderGit2, LuTriangleAlert } from 'react-icons/lu';
import type { ConnectionRepo, UserConnection } from '../../types';

type RepoListProps = {
  repos: ConnectionRepo[];
  allConnections: UserConnection[];
};

export function RepoList({ repos, allConnections }: Readonly<RepoListProps>) {
  if (repos.length === 0) {
    return (
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderStyle="dashed"
        borderRadius="md"
        paddingX={5}
        paddingY={6}
        textAlign="center"
      >
        <PMText fontSize="sm" color="secondary">
          This connection has no repos selected yet.
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={0} align="stretch">
      {repos.map((repo, idx) => (
        <RepoRow
          key={repo.id}
          repo={repo}
          isLast={idx === repos.length - 1}
          allConnections={allConnections}
        />
      ))}
    </PMVStack>
  );
}

type RepoRowProps = {
  repo: ConnectionRepo;
  isLast: boolean;
  allConnections: UserConnection[];
};

function RepoRow({ repo, isLast, allConnections }: Readonly<RepoRowProps>) {
  const dup = repo.duplicatedIn ?? [];
  const dupNames = dup
    .map((id) => allConnections.find((c) => c.id === id))
    .filter((c): c is UserConnection => !!c)
    .map((c) => c.displayName.trim() || c.identifier);

  return (
    <PMHStack
      gap={3}
      align="center"
      paddingX={3}
      paddingY={2.5}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
    >
      <PMIcon fontSize="sm" color="text.faded">
        <LuFolderGit2 />
      </PMIcon>
      <PMText fontSize="sm" color="primary" flex={1} minW={0} truncate>
        {repo.path}
      </PMText>
      {dupNames.length > 0 && (
        <PMTooltip
          label={
            <PMBox maxWidth="260px">
              <PMText fontSize="xs" fontWeight="semibold" marginBottom={1}>
                Also reachable from
              </PMText>
              {dupNames.map((n) => (
                <PMText key={n} fontSize="xs">
                  • {n}
                </PMText>
              ))}
            </PMBox>
          }
        >
          <PMHStack
            gap={1.5}
            paddingX={2}
            paddingY={0.5}
            borderRadius="sm"
            bg="background.tertiary"
            tabIndex={0}
            aria-label={`Duplicated in ${dupNames.length} other connection${dupNames.length === 1 ? '' : 's'}`}
            cursor="help"
          >
            <PMIcon fontSize="xs" color="orange.500">
              <LuTriangleAlert />
            </PMIcon>
            <PMText fontSize="xs" color="primary" fontWeight="medium">
              Also in {dupNames.length} other connection
              {dupNames.length === 1 ? '' : 's'}
            </PMText>
          </PMHStack>
        </PMTooltip>
      )}
    </PMHStack>
  );
}
