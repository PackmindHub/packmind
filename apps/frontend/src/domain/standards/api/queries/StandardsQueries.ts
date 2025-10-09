import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { standardsGateway } from '../gateways';
import { RuleId, StandardId } from '@packmind/shared/types';
import { GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY } from '../../../deployments/api/queryKeys';
import {
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  GET_STANDARDS_KEY,
  GET_STANDARD_BY_ID_KEY,
  GET_STANDARD_VERSIONS_KEY,
  GET_RULES_BY_STANDARD_ID_KEY,
} from '../queryKeys';

export const useGetStandardsQuery = () => {
  return useQuery({
    queryKey: GET_STANDARDS_KEY,
    queryFn: () => {
      return standardsGateway.getStandards();
    },
  });
};

export const getStandardByIdOptions = (id: StandardId) => ({
  queryKey: [...GET_STANDARD_BY_ID_KEY, id],
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
        queryKey: GET_STANDARDS_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
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
        rules: Array<{ id: RuleId; content: string }>;
        scope?: string | null;
      };
    }) => {
      return standardsGateway.updateStandard(id, standard);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [...GET_STANDARD_BY_ID_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [...GET_STANDARD_VERSIONS_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
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

export const useGetStandardVersionsQuery = (id: StandardId) => {
  return useQuery({
    queryKey: [...GET_STANDARD_VERSIONS_KEY, id],
    queryFn: () => {
      return standardsGateway.getVersionsById(id);
    },
    enabled: !!id, // Only run query if id is provided
  });
};

export const getRulesByStandardIdOptions = (id: StandardId) => ({
  queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, id],
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
        queryKey: GET_STANDARDS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
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
        queryKey: GET_STANDARDS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
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
