/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
const noopMutation: {
  mutate: (...args: any[]) => void;
  mutateAsync: (...args: any[]) => Promise<any>;
  isPending: boolean;
} = {
  mutate: () => {},
  mutateAsync: async () => {},
  isPending: false,
};

export const useUpdateSpaceMutation = () => noopMutation;
export const useLeaveSpaceMutation = () => noopMutation;
export const useDeleteSpaceMutation = () => noopMutation;
