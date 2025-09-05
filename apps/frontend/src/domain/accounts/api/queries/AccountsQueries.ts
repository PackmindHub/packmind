import { useMutation } from '@tanstack/react-query';
import { organizationGateway } from '../gateways';

const CREATE_ORGANIZATION_MUTATION_KEY = 'createOrganization';

export const useCreateOrganizationMutation = () => {
  return useMutation({
    mutationKey: [CREATE_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (organization: { name: string }) => {
      return organizationGateway.createOrganization(organization);
    },
    onSuccess: (data) => {
      console.log('Organization created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
    },
  });
};

// Re-export user queries
export { useGetMeQuery } from './UserQueries';
