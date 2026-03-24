/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
const noopQuery: { data: any; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};
const noopMutation: {
  mutate: (...args: any[]) => void;
  mutateAsync: (...args: any[]) => Promise<any>;
  isPending: boolean;
} = {
  mutate: () => {},
  mutateAsync: async () => {},
  isPending: false,
};

export const useGetGroupedChangeProposalsQuery = (_spaceId?: string) =>
  noopQuery;
export const useListChangeProposalsByStandardQuery = (_id?: string) =>
  noopQuery;
export const useListChangeProposalsByRecipeQuery = (_id?: string) => noopQuery;
export const useListChangeProposalsBySkillQuery = (_id?: string) => noopQuery;
export const useCreateChangeProposalMutation = () => noopMutation;
export const useApplyRecipeChangeProposalsMutation = () => noopMutation;
export const useApplyStandardChangeProposalsMutation = () => noopMutation;
export const useApplySkillChangeProposalsMutation = () => noopMutation;
export const useApplyCreationChangeProposalsMutation = () => noopMutation;
