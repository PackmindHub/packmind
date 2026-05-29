import { PMAlert, PMButton, PMHStack, PMVStack } from '@packmind/ui';
import { Link } from 'react-router';
import { routes } from '../../../shared/utils/routes';

export interface GitNotConnectedNoticeProps {
  /**
   * Current organization slug — used to build the deep link to the Git
   * provider settings page.
   */
  orgSlug: string;
}

/**
 * Shown inside `PrivateLinkForm` when the organization has not connected any
 * Git provider yet. Deep-links to the Git settings page so the admin can fix
 * the prerequisite without losing the link-marketplace flow context.
 */
export const GitNotConnectedNotice = ({
  orgSlug,
}: Readonly<GitNotConnectedNoticeProps>) => {
  return (
    <PMAlert.Root status="info" data-testid="git-not-connected-notice">
      <PMAlert.Indicator />
      <PMVStack align="start" gap={2}>
        <PMAlert.Title>Connect a Git provider first</PMAlert.Title>
        <PMAlert.Description>
          Linking a private marketplace requires a Git provider with read access
          to the repository. Connect one to continue.
        </PMAlert.Description>
        <PMHStack gap={2} paddingTop={1}>
          <PMButton variant="primary" size="sm" asChild>
            <Link to={routes.org.toSettingsGit(orgSlug)}>
              Connect a Git provider
            </Link>
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMAlert.Root>
  );
};
