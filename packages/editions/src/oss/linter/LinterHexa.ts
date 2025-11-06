import { BaseHexa, HexaRegistry } from '@packmind/shared';
import { IDeploymentPort, IStandardsPort, ILinterPort } from '@packmind/types';
import { LinterUsecases } from './LinterUsecases';
import { LinterAdapter } from './LinterAdapter';

export class LinterHexa extends BaseHexa {
  private deploymentAdapter: IDeploymentPort | null = null;
  private standardsAdapter: IStandardsPort | null = null;
  private linterAdapter: ILinterPort;

  constructor(registry: HexaRegistry) {
    super(registry);

    // OSS edition: provide stub implementation of ILinterPort
    this.linterAdapter = new LinterAdapter({});
  }

  public async initializeJobQueues(): Promise<void> {
    // Nothing to do here
  }

  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentAdapter = deploymentPort;
  }

  public setStandardAdapter(standardsPort: IStandardsPort): void {
    this.standardsAdapter = standardsPort;
  }

  public getLinterAdapter(): ILinterPort {
    return this.linterAdapter;
  }

  public getLinterUsecases(): LinterUsecases {
    return new LinterUsecases();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
