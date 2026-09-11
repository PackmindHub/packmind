import { useParams, type LoaderFunctionArgs } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { CommandDetails } from '../../src/domain/commands/components/CommandDetails';
import { CommandId } from '@packmind/types';
import { redirectToContextComponent } from '../../src/shared/data/redirectToContext';

/**
 * The command reads in the Context pane in the plugin-first navigation, this
 * page being the surface of the current one.
 *
 * On the index and not on the layout above it, so that `edit` keeps answering.
 * Editing a command is still a page of its own, and the pane's own Edit button
 * is what opens it.
 */
export async function clientLoader(args: LoaderFunctionArgs) {
  return redirectToContextComponent(args, args.params.commandId as string);
}

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
