import {
  BaseHexa,
  HexaRegistry,
  IDeploymentPort,
  IStandardsPort,
  ILinterPort,
  RuleLanguageDetectionStatus,
} from '@packmind/shared';
import { LinterUsecases } from './LinterUsecases';

export class LinterHexa extends BaseHexa {
  private deploymentAdapter: IDeploymentPort | null = null;
  private standardsAdapter: IStandardsPort | null = null;
  private linterAdapter: ILinterPort;

  constructor(registry: HexaRegistry) {
    super(registry);

    // OSS edition: provide stub implementation of ILinterPort
    this.linterAdapter = {
      copyDetectionProgramsToNewRule: async () => {
        this.logger.debug(
          'copyDetectionProgramsToNewRule not available in OSS edition',
        );
        return { copiedProgramsCount: 0 };
      },
      copyRuleDetectionAssessments: async () => {
        return { copiedAssessmentsCount: 0 };
      },
      updateRuleDetectionAssessmentAfterUpdate: async () => {
        this.logger.debug(
          'updateDetectionProgramStatus not available in OSS edition',
        );
        return {
          message: '',
          action: 'STATUS_UPDATED',
        };
      },
      computeRuleLanguageDetectionStatus: async () => {
        this.logger.debug(
          'updateDetectionProgramStatus not available in OSS edition',
        );
        return {
          status: RuleLanguageDetectionStatus.NONE,
        };
      },
    };
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
