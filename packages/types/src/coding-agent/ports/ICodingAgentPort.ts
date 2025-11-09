import {
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse,
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse,
} from '../contracts';

export const ICodingAgentPortName = 'ICodingAgentPort' as const;

export interface ICodingAgentPort {
  prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<PrepareRecipesDeploymentResponse>;

  prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<PrepareStandardsDeploymentResponse>;
}
