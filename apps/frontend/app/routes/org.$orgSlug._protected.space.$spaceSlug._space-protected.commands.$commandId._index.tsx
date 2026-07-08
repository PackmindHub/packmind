import { useParams } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { CommandDetails } from '../../src/domain/commands/components/CommandDetails';
import { CommandId } from '@packmind/types';

export default function CommandDetailsIndexRouteModule() {
  const { commandId } = useParams<{
    orgSlug: string;
    commandId: string;
  }>();
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  if (!commandId) {
    return (
      <PMPage title="Command Not Found" subtitle="No command ID provided">
        <PMBox>
          <p>
            The command you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <CommandDetails
      id={commandId as CommandId}
      orgSlug={organization.slug}
      orgName={organization.name}
    />
  );
}
