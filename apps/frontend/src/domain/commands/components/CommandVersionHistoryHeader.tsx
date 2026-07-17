import { PMHStack, PMText } from '@packmind/ui';
import { Command, WithTimestamps } from '@packmind/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { CommandVersionsListDrawer } from './CommandVersionsListDrawer';
import { PackagesPopover } from '../../deployments/components/PackagesPopover';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

interface CommandVersionHistoryHeaderProps {
  recipe: Command;
}

export const CommandVersionHistoryHeader = ({
  recipe,
}: CommandVersionHistoryHeaderProps) => {
  const updatedAt = (recipe as WithTimestamps<Command>).updatedAt;
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return (
    <PMHStack gap={8} alignItems="center" height="full">
      <PMHStack gap={2} alignItems="center" height="full">
        {updatedAt && (
          <PMText variant="small" color="secondary">
            Last updated: {formatDistanceToNowStrict(new Date(updatedAt))} ago
          </PMText>
        )}
      </PMHStack>
      <PMHStack gap={1} alignItems="center" height="full">
        <PMText variant="small" color="secondary">
          Version:
        </PMText>
        <PMText variant="small">{recipe.version}</PMText>
        <CommandVersionsListDrawer recipeId={recipe.id} />
      </PMHStack>
      <PackagesPopover
        artifactId={recipe.id}
        artifactType="recipe"
        artifactKindLabel="command"
        artifactName={recipe.name}
        spaceId={spaceId}
        organizationId={organization?.id}
      />
    </PMHStack>
  );
};
