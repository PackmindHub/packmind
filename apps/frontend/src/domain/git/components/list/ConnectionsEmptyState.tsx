import React from 'react';
import { PMBox, PMButton, PMEmptyState, PMHStack, PMIcon } from '@packmind/ui';
import { LuGithub, LuGitlab, LuPlus } from 'react-icons/lu';

interface ConnectionsEmptyStateProps {
  onAddConnection: () => void;
}

export const ConnectionsEmptyState: React.FC<ConnectionsEmptyStateProps> = ({
  onAddConnection,
}) => (
  <PMBox
    bg="background.primary"
    borderWidth="1px"
    borderColor="border.tertiary"
    borderRadius="md"
    paddingY={10}
  >
    <PMEmptyState
      title="No connections yet"
      description="Connect a GitHub or GitLab account so Packmind can publish your playbooks to the right repos."
      icon={
        <PMHStack gap={2}>
          <VendorTile>
            <LuGithub />
          </VendorTile>
          <VendorTile>
            <LuGitlab />
          </VendorTile>
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

const VendorTile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    <PMIcon fontSize="lg">{children}</PMIcon>
  </PMBox>
);
