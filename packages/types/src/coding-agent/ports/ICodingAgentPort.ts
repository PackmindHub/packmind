import {
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse,
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse,
} from '../contracts';

export interface ICodingAgentPort {
  prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<PrepareRecipesDeploymentResponse>;

  prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<PrepareStandardsDeploymentResponse>;
}
