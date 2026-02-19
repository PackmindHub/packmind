import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPortName,
  IDeploymentPortName,
  IEventTrackingPortName,
  IGitPortName,
  ISpacesPortName,
  IStandardsPortName,
  TrackLinterExecutionCommand,
} from '@packmind/types';
import type {
  IAccountsPort,
  IDeploymentPort,
  IEventTrackingPort,
  IGitPort,
  ILinterAstPort,
  ILinterPort,
  ILlmPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  DetectionProgram,
  RuleDetectionAssessment,
} from '../../domain';
import type { ILinterDelayedJobs } from '../../domain/jobs/ILinterDelayedJobs';
import type { ILinterRepositories } from '../../domain/repositories/ILinterRepositories';
import {
  AssessRuleDetectionInput,
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  CopyDetectionHeuristicsCommand,
  CopyDetectionHeuristicsResponse,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyLinterArtefactsCommand,
  CopyLinterArtefactsResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  CreateDetectionHeuristicsCommand,
  CreateDetectionHeuristicsResponse,
  CreateDetectionProgramCommand,
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse,
  CreateNewDetectionProgramVersionCommand,
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  GetActiveDetectionProgramResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  GetDetectionHeuristicsCommand,
  GetDetectionHeuristicsResponse,
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse,
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse,
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse,
  IExecuteLinterProgramsUseCase,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  StartProgramGenerationCommand,
  StartProgramGenerationResponse,
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  UpdateActiveDetectionProgramCommand,
  UpdateDetectionProgramCommand,
  UpdateDetectionProgramStatusCommand,
  UpdateRuleDetectionAssessmentAfterUpdateResponse,
  UpdateRuleDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
  UpdateRuleDetectionStatusAfterUpdateCommand,
  UpdateActiveDetectionProgramSeverityCommand,
} from '@packmind/types';
import type { DetectionProgramService } from '../services/DetectionProgramService';
import { ComputeRuleLanguageDetectionStatusUseCase } from '../useCases/computeRuleLanguageDetectionStatus/computeRuleLanguageDetectionStatus.usecase';
import { CopyDetectionHeuristicsUseCase } from '../useCases/copyDetectionHeuristics/copyDetectionHeuristics.usecase';
import { CopyDetectionProgramsToNewRuleUseCase } from '../useCases/copyDetectionProgramsToNewRule/copyDetectionProgramsToNewRule.usecase';
import { CopyLinterArtefactsUseCase } from '../useCases/copyLinterArtefacts/copyLinterArtefacts.usecase';
import { CopyRuleDetectionAssessmentsUseCase } from '../useCases/copyRuleDetectionAssessments/copyRuleDetectionAssessments.usecase';
import { CreateDetectionHeuristicsUseCase } from '../useCases/createDetectionHeuristics/createDetectionHeuristics.usecase';
import { CreateEmptyRuleDetectionAssessmentUseCase } from '../useCases/createEmptyRuleDetectionAssessment/createEmptyRuleDetectionAssessment.usecase';
import { GetDetectionProgramsForPackagesUseCase } from '../useCases/getDetectionProgramsForPackages/getDetectionProgramsForPackages.usecase';
import { CreateDetectionProgramUseCase } from '../useCases/createDetectionProgram/createDetectionProgram.usecase';
import { CreateNewDetectionProgramVersionUsecase } from '../useCases/createNewDetectionProgramVersion/createNewDetectionProgramVersion.usecase';
import { GetActiveDetectionProgramUseCase } from '../useCases/getActiveDetectionProgram/getActiveDetectionProgram.usecase';
import { GetActiveDetectionProgramForRuleUseCase } from '../useCases/getActiveDetectionProgramForRule/getActiveDetectionProgramForRule.usecase';
import { GetAllDetectionProgramsByRuleUseCase } from '../useCases/getAllDetectionProgramsByRule/getAllDetectionProgramsByRule.usecase';
import { GetDetectionHeuristicsUseCase } from '../useCases/getDetectionHeuristics/getDetectionHeuristics.usecase';
import { GetDetectionProgramMetadataUseCase } from '../useCases/getDetectionProgramMetadata/getDetectionProgramMetadata.usecase';
import { GetDraftDetectionProgramForRuleUseCase } from '../useCases/getDraftDetectionProgramForRule/getDraftDetectionProgramForRule.usecase';
import { GetRuleDetectionAssessmentUseCase } from '../useCases/getRuleDetectionAssessment/getRuleDetectionAssessment.usecase';
import { GetStandardRulesDetectionStatusUseCase } from '../useCases/getStandardRulesDetectionStatus/getStandardRulesDetectionStatus.usecase';
import { ListDetectionProgramUseCase } from '../useCases/listDetectionProgram/listDetectionProgram.usecase';
import { StartGenerationProgramUseCase } from '../useCases/startProgramGeneration/startGenerationProgram.usecase';
import { StartRuleDetectionAssessmentUseCase } from '../useCases/startRuleDetectionAssessment/startRuleDetectionAssessment.usecase';
import { TestProgramExecutionUseCase } from '../useCases/testProgramExecutionUseCase/TestProgramExecutionUseCase';
import { UpdateActiveDetectionProgramUseCase } from '../useCases/updateActiveDetectionProgram/updateActiveDetectionProgram.usecase';
import { UpdateActiveDetectionProgramSeverityUseCase } from '../useCases/updateActiveDetectionProgramSeverity/updateActiveDetectionProgramSeverity.usecase';
import { UpdateDetectionProgramUseCase } from '../useCases/updateDetectionProgram/updateDetectionProgram.usecase';
import { UpdateDetectionProgramStatusUseCase } from '../useCases/updateDetectionProgramStatus/updateDetectionProgramStatus.usecase';
import { TrackLinterExecutionUseCase } from '../useCases/trackLinterExecution/trackLinterExecution.usecase';
import { UpdateRuleDetectionHeuristicsUseCase } from '../useCases/updateRuleDetectionHeuristics/updateRuleDetectionHeuristics.usecase';
import { UpdateRuleDetectionStatusAfterUpdateUseCase } from '../useCases/updateRuleDetectionStatusAfterUpdate/updateRuleDetectionStatusAfterUpdate.usecase';

type LinterAdapterDependencies = {
  hexaFactory: {
    getDetectionProgramService(): DetectionProgramService;
    getRepositories(): ILinterRepositories;
  };
  executeLinterProgramsUseCase: IExecuteLinterProgramsUseCase;
};

/**
 * LinterAdapter - Adapter for the Linter domain following hexagonal architecture.
 *
 * This adapter implements the ILinterPort interface and exposes linter functionality
 * to other domains. It manages detection programs, assessments, and heuristics for rules.
 *
 * Required ports:
 * - IStandardsPort: Access to standards and rules
 * - IGitPort: Access to git repositories
 * - IAccountsPort: Access to user and organization data
 *
 * Optional ports (set to undefined if not needed):
 * - IDeploymentPort: Access to deployment information (for listDetectionPrograms)
 * - ISpacesPort: Access to space information (for listDetectionPrograms)
 *
 * The adapter also requires ILinterDelayedJobs which is built in LinterHexa
 * and passed during initialization.
 */
export class LinterAdapter implements IBaseAdapter<ILinterPort>, ILinterPort {
  private readonly detectionProgramService: DetectionProgramService;
  private readonly repositories: ILinterRepositories;
  private readonly executeLinterProgramsUseCase: IExecuteLinterProgramsUseCase;

  // Required ports - set in initialize()
  private standardsPort!: IStandardsPort;
  private gitPort!: IGitPort;
  private accountsPort!: IAccountsPort;
  private linterDelayedJobs!: ILinterDelayedJobs;

  // Optional ports - may be null
  private deploymentsPort: IDeploymentPort | undefined;
  private spacesPort: ISpacesPort | undefined;
  private eventTrackingPort: IEventTrackingPort | null = null;
  private llmPort: ILlmPort | null = null;
  private linterAstPort: ILinterAstPort | null = null;

  // Use cases - created in initialize() after ports are set
  private _createDetectionProgramUseCase!: CreateDetectionProgramUseCase;
  private _getActiveDetectionProgramUseCase!: GetActiveDetectionProgramUseCase;
  private _createNewDetectionProgramVersionUseCase!: CreateNewDetectionProgramVersionUsecase;
  private _listDetectionProgramUseCase!: ListDetectionProgramUseCase;
  private _updateDetectionProgramUseCase!: UpdateDetectionProgramUseCase;
  private _updateActiveDetectionProgramUseCase!: UpdateActiveDetectionProgramUseCase;
  private _updateActiveDetectionProgramSeverityUseCase!: UpdateActiveDetectionProgramSeverityUseCase;
  private _startGenerationProgramUseCase!: StartGenerationProgramUseCase;
  private _getAllDetectionProgramsByRuleUseCase!: GetAllDetectionProgramsByRuleUseCase;
  private _getDetectionProgramMetadataUseCase!: GetDetectionProgramMetadataUseCase;
  private _copyDetectionProgramsToNewRuleUseCase!: CopyDetectionProgramsToNewRuleUseCase;
  private _copyRuleDetectionAssessmentsUseCase!: CopyRuleDetectionAssessmentsUseCase;
  private _copyDetectionHeuristicsUseCase!: CopyDetectionHeuristicsUseCase;
  private _copyLinterArtefactsUseCase!: CopyLinterArtefactsUseCase;
  private _getDraftDetectionProgramForRuleUseCase!: GetDraftDetectionProgramForRuleUseCase;
  private _getActiveDetectionProgramForRuleUseCase!: GetActiveDetectionProgramForRuleUseCase;
  private _updateDetectionProgramStatusUseCase!: UpdateDetectionProgramStatusUseCase;
  private _updateRuleDetectionStatusAfterUpdateUseCase!: UpdateRuleDetectionStatusAfterUpdateUseCase;
  private _startRuleDetectionAssessmentUseCase!: StartRuleDetectionAssessmentUseCase;
  private _getRuleDetectionAssessmentUseCase!: GetRuleDetectionAssessmentUseCase;
  private _computeRuleLanguageDetectionStatusUseCase!: ComputeRuleLanguageDetectionStatusUseCase;
  private _getStandardRulesDetectionStatusUseCase!: GetStandardRulesDetectionStatusUseCase;
  private _testProgramExecutionUseCase!: TestProgramExecutionUseCase;
  private _updateRuleDetectionHeuristicsUseCase!: UpdateRuleDetectionHeuristicsUseCase;
  private _getDetectionHeuristicsUseCase!: GetDetectionHeuristicsUseCase;
  private _createDetectionHeuristicsUseCase!: CreateDetectionHeuristicsUseCase;
  private _getDetectionProgramsForPackagesUseCase!: GetDetectionProgramsForPackagesUseCase;
  private _createEmptyRuleDetectionAssessmentUseCase!: CreateEmptyRuleDetectionAssessmentUseCase;
  private _trackLinterExecutionUseCase!: TrackLinterExecutionUseCase;

  constructor({
    hexaFactory,
    executeLinterProgramsUseCase,
  }: LinterAdapterDependencies) {
    this.detectionProgramService = hexaFactory.getDetectionProgramService();
    this.repositories = hexaFactory.getRepositories();
    this.executeLinterProgramsUseCase = executeLinterProgramsUseCase;
  }

  /**
   * Initialize adapter with ports from registry.
   * All ports in signature are REQUIRED except deploymentsPort, spacesPort, and llmPort.
   */
  public async initialize(ports: {
    [IStandardsPortName]: IStandardsPort;
    [IGitPortName]: IGitPort;
    [IAccountsPortName]: IAccountsPort;
    [IDeploymentPortName]?: IDeploymentPort;
    [ISpacesPortName]?: ISpacesPort;
    [IEventTrackingPortName]: IEventTrackingPort | null;
    llmPort: ILlmPort | null;
    linterAstPort: ILinterAstPort | null;
    linterDelayedJobs: ILinterDelayedJobs;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    // Step 1: Set all ports
    this.standardsPort = ports[IStandardsPortName];
    this.gitPort = ports[IGitPortName];
    this.accountsPort = ports[IAccountsPortName];
    this.linterDelayedJobs = ports.linterDelayedJobs;
    this.deploymentsPort = ports[IDeploymentPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.eventTrackingPort = ports[IEventTrackingPortName];
    this.llmPort = ports.llmPort;
    this.linterAstPort = ports.linterAstPort;

    // Step 2: Validate all required ports are set
    if (!this.isReady()) {
      throw new Error('LinterAdapter: Required ports not provided');
    }

    // Step 3: Create all use cases with non-null ports
    this._createDetectionProgramUseCase = new CreateDetectionProgramUseCase(
      this.detectionProgramService,
      this.standardsPort,
      this.linterAstPort,
    );

    this._getActiveDetectionProgramUseCase =
      new GetActiveDetectionProgramUseCase(
        this.detectionProgramService,
        this.standardsPort,
      );

    this._createNewDetectionProgramVersionUseCase =
      new CreateNewDetectionProgramVersionUsecase(
        this.repositories.getDetectionProgramRepository(),
        this.repositories.getActiveDetectionProgramRepository(),
        this.standardsPort,
      );

    this._listDetectionProgramUseCase = new ListDetectionProgramUseCase(
      this.detectionProgramService,
      this.deploymentsPort,
      this.standardsPort,
      this.spacesPort,
      this.gitPort,
    );

    this._updateDetectionProgramUseCase = new UpdateDetectionProgramUseCase(
      this.repositories.getDetectionProgramRepository(),
    );

    this._updateActiveDetectionProgramUseCase =
      new UpdateActiveDetectionProgramUseCase(
        this.repositories.getActiveDetectionProgramRepository(),
        this.repositories.getDetectionProgramRepository(),
      );

    this._updateActiveDetectionProgramSeverityUseCase =
      new UpdateActiveDetectionProgramSeverityUseCase(
        this.repositories.getActiveDetectionProgramRepository(),
      );

    this._startGenerationProgramUseCase = new StartGenerationProgramUseCase(
      this.linterDelayedJobs.generateProgramDelayedJob,
      this.standardsPort,
      () => this,
    );

    this._getAllDetectionProgramsByRuleUseCase =
      new GetAllDetectionProgramsByRuleUseCase(this.repositories);

    this._getDetectionProgramMetadataUseCase =
      new GetDetectionProgramMetadataUseCase(this.repositories);

    this._copyDetectionProgramsToNewRuleUseCase =
      new CopyDetectionProgramsToNewRuleUseCase(this.repositories);

    this._copyRuleDetectionAssessmentsUseCase =
      new CopyRuleDetectionAssessmentsUseCase(this.repositories);

    this._copyDetectionHeuristicsUseCase = new CopyDetectionHeuristicsUseCase(
      this.repositories,
    );

    this._copyLinterArtefactsUseCase = new CopyLinterArtefactsUseCase(this);

    this._getDraftDetectionProgramForRuleUseCase =
      new GetDraftDetectionProgramForRuleUseCase(
        this.detectionProgramService,
        this.standardsPort,
      );

    this._getActiveDetectionProgramForRuleUseCase =
      new GetActiveDetectionProgramForRuleUseCase(
        this.detectionProgramService,
        this.standardsPort,
      );

    this._updateDetectionProgramStatusUseCase =
      new UpdateDetectionProgramStatusUseCase(
        this.repositories,
        this.standardsPort,
        this.executeLinterProgramsUseCase,
      );

    this._updateRuleDetectionStatusAfterUpdateUseCase =
      new UpdateRuleDetectionStatusAfterUpdateUseCase(
        this.repositories,
        this.standardsPort,
        () => this,
      );

    this._startRuleDetectionAssessmentUseCase =
      new StartRuleDetectionAssessmentUseCase(
        this.repositories,
        this.linterDelayedJobs,
        this.standardsPort,
      );

    this._getRuleDetectionAssessmentUseCase =
      new GetRuleDetectionAssessmentUseCase(
        this.repositories,
        this.accountsPort,
      );

    this._computeRuleLanguageDetectionStatusUseCase =
      new ComputeRuleLanguageDetectionStatusUseCase(this.repositories);

    this._getStandardRulesDetectionStatusUseCase =
      new GetStandardRulesDetectionStatusUseCase(
        this.accountsPort,
        this.standardsPort,
        this._computeRuleLanguageDetectionStatusUseCase,
      );

    this._testProgramExecutionUseCase = new TestProgramExecutionUseCase(
      this.repositories,
      this.executeLinterProgramsUseCase,
      this.standardsPort,
    );

    this._updateRuleDetectionHeuristicsUseCase =
      new UpdateRuleDetectionHeuristicsUseCase(
        this.repositories,
        this.standardsPort,
        () => this,
        this.accountsPort,
        this.llmPort,
      );

    this._getDetectionHeuristicsUseCase = new GetDetectionHeuristicsUseCase(
      this.repositories,
    );

    this._createDetectionHeuristicsUseCase =
      new CreateDetectionHeuristicsUseCase(this.repositories);

    this._getDetectionProgramsForPackagesUseCase =
      new GetDetectionProgramsForPackagesUseCase(
        this.detectionProgramService,
        this.deploymentsPort,
        this.standardsPort,
        this.spacesPort,
      );

    this._createEmptyRuleDetectionAssessmentUseCase =
      new CreateEmptyRuleDetectionAssessmentUseCase(this.repositories);

    this._trackLinterExecutionUseCase = new TrackLinterExecutionUseCase(
      ports.eventEmitterService,
    );
  }

  public isReady(): boolean {
    return (
      this.standardsPort !== undefined &&
      this.gitPort !== undefined &&
      this.accountsPort !== undefined &&
      this.linterDelayedJobs !== undefined
    );
  }

  public getPort(): ILinterPort {
    return this as ILinterPort;
  }

  // ILinterPort implementation

  async createDetectionProgram(
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    return this._createDetectionProgramUseCase.execute(command);
  }

  async getActiveDetectionProgram(
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    return this._getActiveDetectionProgramUseCase.execute(command);
  }

  async createNewDetectionProgramVersion(
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    return this._createNewDetectionProgramVersionUseCase.execute(command);
  }

  async listDetectionPrograms(
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    return this._listDetectionProgramUseCase.execute(command);
  }

  async updateDetectionProgram(
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    return this._updateDetectionProgramUseCase.execute(command);
  }

  async updateActiveDetectionProgram(
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    return this._updateActiveDetectionProgramUseCase.execute(command);
  }

  async updateActiveDetectionProgramSeverity(
    command: UpdateActiveDetectionProgramSeverityCommand,
  ): Promise<ActiveDetectionProgram> {
    return this._updateActiveDetectionProgramSeverityUseCase.execute(command);
  }

  async getActiveDetectionProgramById(
    activeDetectionProgramId: ActiveDetectionProgramId,
  ): Promise<ActiveDetectionProgram | null> {
    return this.repositories
      .getActiveDetectionProgramRepository()
      .findById(activeDetectionProgramId);
  }

  async startGenerateProgram(
    command: StartProgramGenerationCommand,
  ): Promise<StartProgramGenerationResponse> {
    return this._startGenerationProgramUseCase.execute(command);
  }

  async getAllDetectionProgramsByRule(
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    return this._getAllDetectionProgramsByRuleUseCase.execute(command);
  }

  async getDetectionProgramMetadata(
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    return this._getDetectionProgramMetadataUseCase.execute(command);
  }

  async copyDetectionProgramsToNewRule(
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse> {
    return this._copyDetectionProgramsToNewRuleUseCase.execute(command);
  }

  async copyRuleDetectionAssessments(
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse> {
    return this._copyRuleDetectionAssessmentsUseCase.execute(command);
  }

  async copyDetectionHeuristics(
    command: CopyDetectionHeuristicsCommand,
  ): Promise<CopyDetectionHeuristicsResponse> {
    return this._copyDetectionHeuristicsUseCase.execute(command);
  }

  async copyLinterArtefacts(
    command: CopyLinterArtefactsCommand,
  ): Promise<CopyLinterArtefactsResponse> {
    return this._copyLinterArtefactsUseCase.execute(command);
  }

  async getDraftDetectionProgramForRule(
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    return this._getDraftDetectionProgramForRuleUseCase.execute(command);
  }

  async getActiveDetectionProgramForRule(
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    return this._getActiveDetectionProgramForRuleUseCase.execute(command);
  }

  async startRuleDetectionAssessment(
    command: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment> {
    return this._startRuleDetectionAssessmentUseCase.execute(command);
  }

  async updateDetectionProgramStatus(
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    return this._updateDetectionProgramStatusUseCase.execute(command);
  }

  async updateRuleDetectionAssessmentAfterUpdate(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    return this._updateRuleDetectionStatusAfterUpdateUseCase.execute(command);
  }

  async getRuleDetectionAssessment(
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    return this._getRuleDetectionAssessmentUseCase.execute(command);
  }

  async computeRuleLanguageDetectionStatus(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    return this._computeRuleLanguageDetectionStatusUseCase.execute(command);
  }

  async getStandardRulesDetectionStatus(
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    return this._getStandardRulesDetectionStatusUseCase.execute(command);
  }

  async testProgramExecution(
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    return this._testProgramExecutionUseCase.execute(command);
  }

  async updateRuleDetectionHeuristics(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse> {
    return this._updateRuleDetectionHeuristicsUseCase.execute(command);
  }

  async getDetectionHeuristics(
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse> {
    return this._getDetectionHeuristicsUseCase.execute(command);
  }

  async createDetectionHeuristics(
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse> {
    return this._createDetectionHeuristicsUseCase.execute(command);
  }

  async getDetectionProgramsForPackages(
    command: GetDetectionProgramsForPackagesCommand,
  ): Promise<GetDetectionProgramsForPackagesResponse> {
    return this._getDetectionProgramsForPackagesUseCase.execute(command);
  }

  async createEmptyRuleDetectionAssessment(
    command: CreateEmptyRuleDetectionAssessmentCommand,
  ): Promise<CreateEmptyRuleDetectionAssessmentResponse> {
    return this._createEmptyRuleDetectionAssessmentUseCase.execute(command);
  }

  async trackLinterExecution(command: TrackLinterExecutionCommand) {
    return this._trackLinterExecutionUseCase.execute(command);
  }
}
