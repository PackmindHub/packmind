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
import { InviteUsersDialog } from '../../../accounts/components';
import { useGetOnboardingStatusQuery } from '../../../accounts/api/queries/AccountsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';

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
  const { spaceSlug } = useCurrentSpace();

  const orgId = organization?.id || ('' as string);
  const orgSlug = organization?.slug || '';

  // Fetch onboarding status from the new endpoint
  const { data: onboardingStatus } = useGetOnboardingStatusQuery(orgId);

  const hasProvider = onboardingStatus?.hasConnectedGitProvider ?? false;
  const hasRepository = onboardingStatus?.hasConnectedGitRepo ?? false;
  const hasStandard = onboardingStatus?.hasCreatedStandard ?? false;
  const hasAnyDeployment = onboardingStatus?.hasDeployed ?? false;
  const hasMultipleMembers = onboardingStatus?.hasInvitedColleague ?? false;

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
                    <NavLink to={routes.org.toSettingsGit(orgSlug)}>
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
                    <NavLink to={routes.org.toSettingsGit(orgSlug)}>
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
                !hasStandard && spaceSlug ? (
                  <PMButton asChild size="xs" variant="secondary">
                    <NavLink
                      to={routes.space.toCreateStandard(orgSlug, spaceSlug)}
                    >
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
                    <NavLink to={routes.org.toDeployments(orgSlug)}>
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
                  <NavLink to={routes.org.toAccountSettings(orgSlug)}>
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
