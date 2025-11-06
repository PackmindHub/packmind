import { BaseHexa, HexaRegistry } from '@packmind/node-utils';
import { IDeploymentPort } from '@packmind/types';

export class AnalyticsHexa extends BaseHexa {
  constructor(registry: HexaRegistry) {
    super(registry);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async trackRecipeUsage(command: {
    recipeSlugs: string[];
    aiAgent: string;
    userId: string;
    organizationId: string;
    gitRepo?: string;
    target?: string;
  }): Promise<never[]> {
    throw new Error(
      'Tracking recipes usage is not available in your version of Packmind. Upgrade to benefit from this feature.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  setDeploymentPort(deploymentPort: IDeploymentPort): void {}
}
