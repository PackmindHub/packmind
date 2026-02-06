import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  PMBox,
  PMButton,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
  PMIcon,
} from '@packmind/ui';
import { LuCheck, LuCircleCheck, LuRocket } from 'react-icons/lu';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { getStandardsBySpaceQueryOptions } from '../../standards/api/queries/StandardsQueries';
import { getSkillsBySpaceQueryOptions } from '../../skills/api/queries/SkillsQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useGetUsersInMyOrganizationQuery } from '../api/queries/UserQueries';
import { DeployWithCliModal } from './DeployWithCliModal';

const StepLabel: React.FC<{ text: string; isCompleted: boolean }> = ({
  text,
  isCompleted,
}) => (
  <PMHStack gap={2} align="center">
    {isCompleted && (
      <PMIcon color="green.300" fontSize="lg" aria-label="completed">
        <LuCircleCheck />
      </PMIcon>
    )}
    <PMText
      as="span"
      textDecorationLine={isCompleted ? 'line-through' : 'none'}
    >
      {text}
    </PMText>
  </PMHStack>
);

export interface GetStartedWithPackmindWidgetProps {
  onCreateArtifact?: () => void;
  onCreatePackage?: () => void;
  onDeployWithCLI?: () => void;
  onInviteTeam?: () => void;
}

export const GetStartedWithPackmindWidget: React.FC<
  GetStartedWithPackmindWidgetProps
> = ({ onCreateArtifact, onCreatePackage, onDeployWithCLI, onInviteTeam }) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { data: spaces } = useGetSpacesQuery();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const firstSpaceSlug = spaces && spaces.length > 0 ? spaces[0].slug : null;
  const firstSpace = spaces?.[0];

  // Fetch data for completion checks
  const { data: standards } = useQuery({
    ...getStandardsBySpaceQueryOptions(firstSpace?.id, organization?.id),
  });
  const { data: skills } = useQuery({
    ...getSkillsBySpaceQueryOptions(organization?.id, firstSpace?.id),
  });
  const { data: packagesResponse } = useListPackagesBySpaceQuery(
    firstSpace?.id,
    organization?.id,
  );
  const { data: onboardingStatus } = useGetOnboardingStatusQuery(
    organization?.id || '',
  );
  const { data: users } = useGetUsersInMyOrganizationQuery();

  // Calculate completion status for each step
  const stepCompletionStatus = useMemo(() => {
    const hasArtifacts =
      (standards && standards.standards.length > 0) ||
      (skills && skills.length > 0);
    const hasPackages =
      packagesResponse?.packages && packagesResponse.packages.length > 0;
    const hasDeployments = onboardingStatus?.hasDeployed || false;
    const hasMultipleUsers = users && users.users.length >= 2;

    return {
      step1: hasArtifacts,
      step2: hasPackages,
      step3: hasDeployments,
      step4: hasMultipleUsers,
    };
  }, [standards, skills, packagesResponse, onboardingStatus, users]);

  const handleCreateArtifact = () => {
    if (onCreateArtifact) {
      onCreateArtifact();
    } else if (organization?.slug && firstSpaceSlug) {
      navigate(routes.space.toStandards(organization.slug, firstSpaceSlug));
    }
  };

  const handleCreatePackage = () => {
    if (onCreatePackage) {
      onCreatePackage();
    } else if (organization?.slug && firstSpaceSlug) {
      navigate(routes.space.toPackages(organization.slug, firstSpaceSlug));
    }
  };

  const handleDeployWithCLI = () => {
    if (onDeployWithCLI) {
      onDeployWithCLI();
    } else {
      setIsDeployModalOpen(true);
    }
  };

  const handleInviteTeam = () => {
    if (onInviteTeam) {
      onInviteTeam();
    } else if (organization?.slug) {
      navigate(routes.org.toSettingsUsers(organization.slug));
    }
  };

  // Hide widget when all 4 steps are complete
  const allStepsComplete =
    stepCompletionStatus.step1 &&
    stepCompletionStatus.step2 &&
    stepCompletionStatus.step3 &&
    stepCompletionStatus.step4;

  if (allStepsComplete) {
    return null;
  }

  return (
    <PMBox backgroundColor="background.primary" p={6} borderRadius="md">
      <PMVStack gap={6} align="stretch">
        <PMVStack gap={2} align="flex-start">
          <PMHeading level="h3" fontWeight={'bold'}>
            <PMIcon mr={2} color={'branding.primary'}>
              <LuRocket />
            </PMIcon>
            Get started with Packmind
          </PMHeading>
          <PMText as="p" color="secondary">
            Build and distribute your first playbook across your organization.
          </PMText>
        </PMVStack>

        <PMVStack gap={4} align="stretch">
          <PMHStack justify="space-between" align="center">
            <StepLabel
              text="1. Create your first artifacts"
              isCompleted={!!stepCompletionStatus.step1}
            />
            <PMButton variant="secondary" onClick={handleCreateArtifact}>
              Create a standard
            </PMButton>
          </PMHStack>

          <PMHStack justify="space-between" align="center">
            <StepLabel
              text="2. Bundle them into a package"
              isCompleted={!!stepCompletionStatus.step2}
            />
            <PMButton variant="secondary" onClick={handleCreatePackage}>
              Create package
            </PMButton>
          </PMHStack>

          <PMHStack justify="space-between" align="center">
            <StepLabel
              text="3. Distribute your package in your repo"
              isCompleted={stepCompletionStatus.step3}
            />
            <PMButton variant="secondary" onClick={handleDeployWithCLI}>
              Deploy with CLI
            </PMButton>
          </PMHStack>

          <PMHStack justify="space-between" align="center">
            <StepLabel
              text="4. Invite collaborators"
              isCompleted={!!stepCompletionStatus.step4}
            />
            <PMButton variant="secondary" onClick={handleInviteTeam}>
              Invite team
            </PMButton>
          </PMHStack>
        </PMVStack>
      </PMVStack>

      <DeployWithCliModal
        open={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </PMBox>
  );
};
