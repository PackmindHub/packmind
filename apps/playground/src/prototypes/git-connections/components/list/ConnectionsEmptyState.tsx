import { PMBox, PMButton, PMEmptyState, PMHStack, PMIcon } from '@packmind/ui';
import { LuGithub, LuGitlab, LuPlus } from 'react-icons/lu';

type ConnectionsEmptyStateProps = {
  onAddConnection: () => void;
};

export function ConnectionsEmptyState({
  onAddConnection,
}: Readonly<ConnectionsEmptyStateProps>) {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingY={10}
    >
      <PMEmptyState
        title="No connections yet"
        description="Connect a GitHub or GitLab account so Packmind can publish your standards, recipes, and marketplace packages to the right repos."
        icon={
          <PMHStack gap={2}>
            <PMBox
              width="40px"
              height="40px"
              borderRadius="md"
              bg="background.secondary"
              borderWidth="1px"
              borderColor="border.tertiary"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="text.secondary"
            >
              <PMIcon fontSize="lg">
                <LuGithub />
              </PMIcon>
            </PMBox>
            <PMBox
              width="40px"
              height="40px"
              borderRadius="md"
              bg="background.secondary"
              borderWidth="1px"
              borderColor="border.tertiary"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="text.secondary"
            >
              <PMIcon fontSize="lg">
                <LuGitlab />
              </PMIcon>
            </PMBox>
          </PMHStack>
        }
      >
        <PMButton variant="primary" size="sm" onClick={onAddConnection}>
          <PMIcon fontSize="sm">
            <LuPlus />
          </PMIcon>
          Add a connection
        </PMButton>
      </PMEmptyState>
    </PMBox>
  );
}
