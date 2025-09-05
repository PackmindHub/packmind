import React from 'react';
import { PMVStack, PMBox, PMSpinner } from '@packmind/ui';
import { PMPage, PMText } from '@packmind/ui';
import { useAuthContext } from '../hooks/useAuthContext';
import { OrganizationUsersList } from './OrganizationUsersList';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';

export const OrganizationHomePage: React.FC = () => {
  const { isAuthenticated, isLoading, user, organization, error } =
    useAuthContext();

  const getPageState = React.useCallback(() => {
    if (isLoading) {
      return {
        title: 'Loading...',
        subtitle: 'Preparing your organization dashboard',
        breadcrumbs: undefined,
        content: (
          <PMBox display="flex" justifyContent="center" py={8}>
            <PMVStack gap={4}>
              <PMSpinner size="lg" />
              <PMText>Loading your organization...</PMText>
            </PMVStack>
          </PMBox>
        ),
      };
    }
    if (error) {
      return {
        title: 'Error',
        subtitle: 'Unable to load your organization',
        breadcrumbs: undefined,
        content: (
          <PMBox
            p={6}
            borderRadius="md"
            bg="red.50"
            borderColor="red.200"
            borderWidth="1px"
            textAlign="center"
          >
            <PMVStack gap={3}>
              <PMText variant="body-important">
                Failed to load organization data
              </PMText>
              <PMText>
                Please refresh the page or contact support if the problem
                persists.
              </PMText>
            </PMVStack>
          </PMBox>
        ),
      };
    }
    if (!isAuthenticated || !user || !organization) {
      return {
        title: 'Access Required',
        subtitle: 'Please sign in to view your organization',
        breadcrumbs: undefined,
        content: (
          <PMBox
            p={6}
            borderRadius="md"
            bg="yellow.50"
            borderColor="yellow.200"
            borderWidth="1px"
            textAlign="center"
          >
            <PMVStack gap={3}>
              <PMText variant="body-important">Authentication Required</PMText>
              <PMText>
                You need to be signed in to access your organization dashboard.
              </PMText>
            </PMVStack>
          </PMBox>
        ),
      };
    }
    return {
      title: organization.name,
      subtitle: `Welcome to your organization dashboard, ${user.username}`,
      breadcrumbs: [{ label: 'Home', isCurrentPage: true }],
      content: (
        <PMVStack align="stretch" gap={8}>
          <OrganizationUsersList title="Team Members" showCount={true} />
        </PMVStack>
      ),
    };
  }, [isAuthenticated, isLoading, user, organization, error]);

  const { title, subtitle, content } = getPageState();

  return (
    <PMPage
      title={title}
      subtitle={subtitle}
      breadcrumbComponent={<AutobreadCrumb />}
    >
      {content}
    </PMPage>
  );
};
