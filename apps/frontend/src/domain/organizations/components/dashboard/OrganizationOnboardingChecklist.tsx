import React from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMList,
  PMPageSection,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { NavLink } from 'react-router';
import { LuCircleCheckBig, LuCircle } from 'react-icons/lu';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useGetGitReposQuery } from '../../../git/api/queries/GitRepoQueries';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { InviteUsersDialog } from '../../../accounts/components';
import { OrganizationId } from '@packmind/accounts/types';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';

const ItemRow: React.FC<{
  done: boolean;
  title: React.ReactNode;
  completable?: boolean;
  description?: React.ReactNode;
  cta?: React.ReactNode;
}> = ({ done, title, completable = true, description, cta }) => (
  <PMHStack justifyContent="space-between" alignItems="center" gap={4}>
    <PMHStack gap={3} alignItems="center">
      {completable && (
        <PMIcon color={done ? 'branding.primary' : 'secondary'}>
          {done ? <LuCircleCheckBig /> : <LuCircle />}
        </PMIcon>
      )}
      <PMVStack align="start" gap={0}>
        <PMText color={done ? 'primary' : 'tertiary'} variant="small">
          {title}
        </PMText>
        {description ? (
          <PMText color="faded" variant="small">
            {description}
          </PMText>
        ) : null}
      </PMVStack>
    </PMHStack>
    <PMBox>{cta}</PMBox>
  </PMHStack>
);

export const OrganizationOnboardingChecklist: React.FC = () => {
  const { organization } = useAuthContext();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  // Data sources for auto-checks
  const orgId: OrganizationId = organization?.id || ('' as OrganizationId);
  const orgSlug = organization?.slug || '';
  const { data: providers = [] } = useGetGitProvidersQuery(orgId);
  const { data: repos = [] } = useGetGitReposQuery();
  const { data: standards = [] } = useGetStandardsQuery();
  const { data: recipesOverview } = useGetRecipesDeploymentOverviewQuery();
  const { data: standardsOverview } = useGetStandardsDeploymentOverviewQuery();
  const { data: members = [] } = useGetUsersInMyOrganizationQuery();

  const hasProvider = providers.length > 0;
  const hasRepository = repos.length > 0;
  const hasStandard = standards.length > 0;
  const hasAnyDeployment = Boolean(
    (recipesOverview?.recipes ?? []).some(
      (r) => r.targetDeployments.length > 0,
    ) ||
      (standardsOverview?.standards ?? []).some(
        (s) => s.targetDeployments.length > 0,
      ),
  );
  const hasMultipleMembers = members.length > 1;

  return (
    <PMPageSection
      title="Checklist"
      headingLevel="h5"
      backgroundColor="primary"
    >
      <PMVStack align="stretch" gap={4} py={6} width={'full'}>
        <PMList.Root listStyle={'none'} spaceY={4}>
          <PMList.Item>
            <ItemRow
              done={hasProvider}
              title={<>Connect a Git provider</>}
              description={
                hasProvider
                  ? 'Git provider is connected.'
                  : 'Authorize GitHub or GitLab to let Packmind read/write to repositories.'
              }
              cta={
                !hasProvider ? (
                  <PMButton asChild size="xs" variant="secondary">
                    <NavLink to={`/org/${orgSlug}/settings/git`}>
                      Go to Git settings
                    </NavLink>
                  </PMButton>
                ) : null
              }
            />
          </PMList.Item>

          <PMList.Item>
            <ItemRow
              done={hasRepository}
              title={<>Add at least one repository</>}
              description={
                hasRepository
                  ? 'At least one repository is connected.'
                  : 'Select repositories to distribute your standards and recipes.'
              }
              cta={
                !hasRepository ? (
                  <PMButton asChild size="xs" variant="secondary">
                    <NavLink to={`/org/${orgSlug}/settings/git`}>
                      Add repositories
                    </NavLink>
                  </PMButton>
                ) : null
              }
            />
          </PMList.Item>

          <PMList.Item>
            <ItemRow
              done={hasStandard}
              title={<>Create your first standard</>}
              description={
                hasStandard
                  ? 'You already have at least one standard.'
                  : 'Start by creating a standard that describes a coding practice.'
              }
              cta={
                !hasStandard ? (
                  <PMButton asChild size="xs" variant="secondary">
                    <NavLink to={`/org/${orgSlug}/standards/create`}>
                      Create standard
                    </NavLink>
                  </PMButton>
                ) : null
              }
            />
          </PMList.Item>

          <PMList.Item>
            <ItemRow
              done={hasAnyDeployment}
              title={<>Make your first deployment</>}
              description={
                hasAnyDeployment
                  ? 'At least one standard or recipe is deployed.'
                  : 'Deploy a standard or a recipe to a target repository.'
              }
              cta={
                !hasAnyDeployment ? (
                  <PMButton asChild size="xs" variant="secondary">
                    <NavLink to={`/org/${orgSlug}/deployments`}>
                      View deployments
                    </NavLink>
                  </PMButton>
                ) : null
              }
            />
          </PMList.Item>

          <PMList.Item>
            <ItemRow
              done={hasMultipleMembers}
              title={<>Invite a colleague</>}
              description={
                hasMultipleMembers
                  ? 'Your organization has multiple members.'
                  : 'Invite at least one teammate to collaborate.'
              }
              cta={
                !hasMultipleMembers ? (
                  <PMButton
                    size="xs"
                    variant="secondary"
                    onClick={() => setInviteOpen(true)}
                  >
                    Invite users
                  </PMButton>
                ) : null
              }
            />
          </PMList.Item>
          <PMSeparator borderColor={'border.tertiary'} />
          <PMList.Item>
            <ItemRow
              done={true}
              completable={false}
              title={<>Configure MCP access token</>}
              description={
                'Generate an MCP token to connect Packmind with coding assistants.'
              }
              cta={
                <PMButton asChild size="xs" variant="secondary">
                  <NavLink to={`/org/${orgSlug}/account-settings`}>
                    Open account settings
                  </NavLink>
                </PMButton>
              }
            />
          </PMList.Item>
        </PMList.Root>

        <InviteUsersDialog open={inviteOpen} setOpen={setInviteOpen} />
      </PMVStack>
    </PMPageSection>
  );
};
