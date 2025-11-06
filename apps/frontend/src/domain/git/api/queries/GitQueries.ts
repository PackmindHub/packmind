import { useQuery } from '@tanstack/react-query';
import { gitGateway } from '../gateways';
import { OrganizationId } from '@packmind/types';
import { GET_GIT_WEBHOOKS_KEY } from '../queryKeys';

export const useGetGitWebhooksQuery = (organizationId: OrganizationId) => {
  return useQuery({
    queryKey: GET_GIT_WEBHOOKS_KEY,
    queryFn: () => {
      return gitGateway.listWebHooks(organizationId);
    },
  });
};
