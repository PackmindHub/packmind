import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { IDeploymentPort, ILinterPort, IStandardsPort } from '@packmind/types';
import { DataSource } from 'typeorm';
import { LinterAdapter } from './LinterAdapter';
import { LinterUsecases } from './LinterUsecases';

export class LinterHexa extends BaseHexa<BaseHexaOpts, ILinterPort> {
  private deploymentAdapter: IDeploymentPort | null = null;
  private standardsAdapter: IStandardsPort | null = null;
  private linterAdapter: ILinterPort;

  constructor(dataSource: DataSource) {
    super(dataSource);

    // OSS edition: provide stub implementation of ILinterPort
    this.linterAdapter = new LinterAdapter({});
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
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

  public getAdapter(): ILinterPort {
    return this.linterAdapter;
  }

  public getLinterUsecases(): LinterUsecases {
    return new LinterUsecases();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
