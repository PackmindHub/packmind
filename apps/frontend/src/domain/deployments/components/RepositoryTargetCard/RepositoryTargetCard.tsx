import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  PMBox,
  PMButton,
  PMFlex,
  PMHStack,
  PMText,
  PMVStack,
  PMIcon,
  PMEmptyState,
} from '@packmind/ui';
import { LuSettings, LuTarget } from 'react-icons/lu';
import { TargetWithRepository, Target } from '@packmind/types';
import { GitRepoId } from '@packmind/types';
import { TargetBadge } from '../TargetBadge/TargetBadge';
import { TargetManagementDialog } from '../TargetManagementDialog/TargetManagementDialog';

interface RepositoryTargetCardProps {
  repositoryName: string;
  providerUrl: string;
  targets: TargetWithRepository[];
  gitRepoId: GitRepoId;
}

export const RepositoryTargetCard: React.FC<RepositoryTargetCardProps> = ({
  repositoryName,
  providerUrl,
  targets,
  gitRepoId,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<
    string | undefined
  >();
  const processingSelectionRef = useRef(false);

  const handleTargetClick = useCallback((target: Target) => {
    setSelectedTargetId(target.id);
  }, []);

  // Stable callback that doesn't change between renders
  const onTargetSelected = useMemo(() => {
    return (target: Target) => {
      // Prevent processing the same selection multiple times
      if (processingSelectionRef.current) return;
      processingSelectionRef.current = true;

      // Clear the selection after the dialog has had time to process it
      setTimeout(() => {
        setSelectedTargetId(undefined);
        processingSelectionRef.current = false;
      }, 100);
    };
  }, []); // Empty dependency array makes this stable

  return (
    <PMBox
      p={6}
      border="1px solid"
      borderColor="border.secondary"
      borderRadius="lg"
      bg="background.primary"
      shadow="sm"
      _hover={{ shadow: 'md' }}
      transition="shadow 0.2s"
    >
      <PMVStack gap={4} align="stretch">
        {/* Header */}
        <PMHStack gap={2} justify="space-between" align="stretch">
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold" color="primary">
              {repositoryName}
            </PMText>
            <PMText fontSize="sm" color="secondary">
              {providerUrl}
            </PMText>
          </PMVStack>
          <div>
            <TargetManagementDialog
              gitRepoId={gitRepoId}
              repositoryName={repositoryName}
              owner={targets[0]?.repository.owner || ''}
              repo={targets[0]?.repository.repo || ''}
              branch={targets[0]?.repository.branch}
              selectedTargetId={selectedTargetId}
              onTargetSelected={onTargetSelected}
              trigger={
                <PMButton size="sm" variant="outline">
                  <PMIcon as={LuSettings} />
                  Manage Targets
                </PMButton>
              }
            />
          </div>
        </PMHStack>

        {/* Targets */}
        <PMVStack gap={3} align="stretch">
          <PMText fontSize="sm" fontWeight="medium" color="primary">
            Targets ({targets.length})
          </PMText>

          {targets.length > 0 && (
            <PMFlex gap={2} wrap="wrap">
              {targets.map((target) => (
                <TargetBadge
                  key={target.id}
                  target={target}
                  branch={target.repository.branch}
                  variant="subtle"
                  clickable={true}
                  onClick={handleTargetClick}
                />
              ))}
            </PMFlex>
          )}

          {targets.length === 0 && (
            <PMEmptyState
              title="No targets configured"
              description="Click 'Manage Targets' to create your first deployment target"
              icon={<PMIcon as={LuTarget} boxSize="8" color="gray.400" />}
            />
          )}
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
};
