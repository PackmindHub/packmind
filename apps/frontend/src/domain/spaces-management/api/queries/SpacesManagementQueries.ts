import { useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesManagementGateway } from '../gateways';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { spacesQueryKeys } from '../../../spaces/api/queryKeys';

const CREATE_SPACE_MUTATION_KEY = 'createSpace';

export const useCreateSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [CREATE_SPACE_MUTATION_KEY],
    mutationFn: async (name: string) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.createSpace(organization.id, name);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...spacesQueryKeys.all],
      });
    },
  });
};
