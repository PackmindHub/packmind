import {
  BaseHexa,
  HexaRegistry,
  IDeploymentPort,
  IStandardsPort,
} from '@packmind/shared';

export class LinterHexa extends BaseHexa {
  private deploymentAdapter: IDeploymentPort | null = null;
  private standardsAdapter: IStandardsPort | null = null;

  constructor(registry: HexaRegistry) {
    super(registry);
  }

  public async initializeJobQueues(): Promise<void> {
    // Nothing to do here
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentAdapter = deploymentPort;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setStandardAdapter(standardsPort: IStandardsPort): void {
    this.standardsAdapter = standardsPort;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
