import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { standardsGateway } from '../gateways';
import { StandardId } from '@packmind/standards';
import { GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY } from '../../../deployments/api/queries/DeploymentsQueries';

export const GET_STANDARDS_QUERY_KEY = 'standards';

export const useGetStandardsQuery = () => {
  return useQuery({
    queryKey: [GET_STANDARDS_QUERY_KEY],
    queryFn: () => {
      return standardsGateway.getStandards();
    },
  });
};

const GET_STANDARD_BY_ID_QUERY_KEY = 'standard';

export const getStandardByIdOptions = (id: StandardId) => ({
  queryKey: [GET_STANDARD_BY_ID_QUERY_KEY, id],
  queryFn: () => standardsGateway.getStandardById(id),
  enabled: !!id,
});

export const useGetStandardByIdQuery = (id: StandardId) => {
  return useQuery(getStandardByIdOptions(id));
};

const CREATE_STANDARD_MUTATION_KEY = 'createStandard';

export const useCreateStandardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_STANDARD_MUTATION_KEY],
    mutationFn: async (newStandard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    }) => {
      return standardsGateway.createStandard({ ...newStandard });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error creating standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const UPDATE_STANDARD_MUTATION_KEY = 'updateStandard';

export const useUpdateStandardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_STANDARD_MUTATION_KEY],
    mutationFn: async ({
      id,
      standard,
    }: {
      id: StandardId;
      standard: {
        name: string;
        description: string;
        rules: Array<{ content: string }>;
        scope?: string | null;
      };
    }) => {
      return standardsGateway.updateStandard(id, standard);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARD_BY_ID_QUERY_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARD_VERSIONS_QUERY_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RULES_BY_STANDARD_ID_QUERY_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error updating standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const GET_STANDARD_VERSIONS_QUERY_KEY = 'standardVersions';

export const useGetStandardVersionsQuery = (id: StandardId) => {
  return useQuery({
    queryKey: [GET_STANDARD_VERSIONS_QUERY_KEY, id],
    queryFn: () => {
      return standardsGateway.getVersionsById(id);
    },
    enabled: !!id, // Only run query if id is provided
  });
};

const GET_RULES_BY_STANDARD_ID_QUERY_KEY = 'rulesByStandardId';

export const getRulesByStandardIdOptions = (id: StandardId) => ({
  queryKey: [GET_RULES_BY_STANDARD_ID_QUERY_KEY, id],
  queryFn: () => standardsGateway.getRulesByStandardId(id),
  enabled: !!id,
});

export const useGetRulesByStandardIdQuery = (id: StandardId) => {
  return useQuery(getRulesByStandardIdOptions(id));
};

const DELETE_STANDARD_MUTATION_KEY = 'deleteStandard';

export const useDeleteStandardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_STANDARD_MUTATION_KEY],
    mutationFn: async (id: StandardId) => {
      return standardsGateway.deleteStandard(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const DELETE_STANDARDS_BATCH_MUTATION_KEY = 'deleteStandardsBatch';

export const useDeleteStandardsBatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_STANDARDS_BATCH_MUTATION_KEY],
    mutationFn: async (standardIds: StandardId[]) => {
      return standardsGateway.deleteStandardsBatch(standardIds);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting standards in batch');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
