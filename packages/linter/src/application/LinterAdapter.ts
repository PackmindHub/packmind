import { CreateDetectionProgramUseCase } from './useCases/createDetectionProgram/createDetectionProgram.usecase';
import { DetectionProgramService } from './services/DetectionProgramService';
import { GetActiveDetectionProgramUseCase } from './useCases/getActiveDetectionProgram/getActiveDetectionProgram.usecase';
import { CreateNewDetectionProgramVersionUsecase } from './useCases/createNewDetectionProgramVersion/createNewDetectionProgramVersion.usecase';
import { ListDetectionProgramUseCase } from './useCases/listDetectionProgram/listDetectionProgram.usecase';
import { UpdateDetectionProgramUseCase } from './useCases/updateDetectionProgram/updateDetectionProgram.usecase';
import { UpdateActiveDetectionProgramUseCase } from './useCases/updateActiveDetectionProgram/updateActiveDetectionProgram.usecase';
import { StartGenerationProgramUseCase } from './useCases/startProgramGeneration/startGenerationProgram.usecase';
import { GetAllDetectionProgramsByRuleUseCase } from './useCases/getAllDetectionProgramsByRule/getAllDetectionProgramsByRule.usecase';
import { GetDetectionProgramMetadataUseCase } from './useCases/getDetectionProgramMetadata/getDetectionProgramMetadata.usecase';
import { CopyDetectionProgramsToNewRuleUseCase } from './useCases/copyDetectionProgramsToNewRule/copyDetectionProgramsToNewRule.usecase';
import { CopyRuleDetectionAssessmentsUseCase } from './useCases/copyRuleDetectionAssessments/copyRuleDetectionAssessments.usecase';
import { GetDraftDetectionProgramForRuleUseCase } from './useCases/getDraftDetectionProgramForRule/getDraftDetectionProgramForRule.usecase';
import { GetActiveDetectionProgramForRuleUseCase } from './useCases/getActiveDetectionProgramForRule/getActiveDetectionProgramForRule.usecase';
import { UpdateDetectionProgramStatusUseCase } from './useCases/updateDetectionProgramStatus/updateDetectionProgramStatus.usecase';
import { UpdateRuleDetectionStatusAfterUpdateUseCase } from './useCases/updateRuleDetectionStatusAfterUpdate/updateRuleDetectionStatusAfterUpdate.usecase';
import { StartRuleDetectionAssessmentUseCase } from './useCases/startRuleDetectionAssessment/startRuleDetectionAssessment.usecase';
import { GetRuleDetectionAssessmentUseCase } from './useCases/getRuleDetectionAssessment/getRuleDetectionAssessment.usecase';
import { ComputeRuleLanguageDetectionStatusUseCase } from './useCases/computeRuleLanguageDetectionStatus/computeRuleLanguageDetectionStatus.usecase';
import { GetStandardRulesDetectionStatusUseCase } from './useCases/getStandardRulesDetectionStatus/getStandardRulesDetectionStatus.usecase';
import { TestProgramExecutionUseCase } from './useCases/testProgramExecutionUseCase/TestProgramExecutionUseCase';
import { LinterHexaFactory } from '../LinterHexaFactory';
import { ILinterRepositories } from '../domain/repositories/ILinterRepositories';
import { ILinterDelayedJobs } from '../domain/jobs/ILinterDelayedJobs';
import type {
  IGitPort,
  ILinterPort,
  IDeploymentPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { OrganizationProvider, UserProvider } from '@packmind/types';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  DetectionProgram,
  RuleDetectionAssessment,
} from '../domain';
import {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse,
  IExecuteLinterProgramsUseCase,
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  AssessRuleDetectionInput,
  CreateDetectionProgramCommand,
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramResponse,
  CreateNewDetectionProgramVersionCommand,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  UpdateDetectionProgramCommand,
  UpdateActiveDetectionProgramCommand,
  StartProgramGenerationCommand,
  StartProgramGenerationResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  UpdateDetectionProgramStatusCommand,
  UpdateRuleDetectionAssessmentAfterUpdateResponse,
  UpdateRuleDetectionStatusAfterUpdateCommand,
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse,
} from '@packmind/types';

type LinterAdapterDependencies = {
  hexaFactory: LinterHexaFactory;
  gitPort: IGitPort;
  linterDelayedJobs: ILinterDelayedJobs;
  executeLinterProgramsUseCase: IExecuteLinterProgramsUseCase;
  userProvider: UserProvider;
  organizationProvider: OrganizationProvider;
  standardsAdapter?: IStandardsPort;
  deploymentsAdapter?: IDeploymentPort;
  spacesAdapter?: ISpacesPort;
};

export class LinterAdapter implements ILinterPort {
  private readonly detectionProgramService: DetectionProgramService;
  private readonly repositories: ILinterRepositories;
  private standardsAdapter?: IStandardsPort;
  private spacesAdapter?: ISpacesPort;
  private readonly gitPort: IGitPort;
  private deploymentsAdapter?: IDeploymentPort;
  private readonly linterDelayedJobs: ILinterDelayedJobs;
  private readonly executeLinterProgramsUseCase: IExecuteLinterProgramsUseCase;
  private readonly userProvider: UserProvider;
  private readonly organizationProvider: OrganizationProvider;

  constructor({
    hexaFactory,
    gitPort,
    linterDelayedJobs,
    executeLinterProgramsUseCase,
    userProvider,
    organizationProvider,
    standardsAdapter,
    deploymentsAdapter,
    spacesAdapter,
  }: LinterAdapterDependencies) {
    this.detectionProgramService = hexaFactory.getDetectionProgramService();
    this.repositories = hexaFactory.getRepositories();
    this.gitPort = gitPort;
    this.linterDelayedJobs = linterDelayedJobs;
    this.executeLinterProgramsUseCase = executeLinterProgramsUseCase;
    this.userProvider = userProvider;
    this.organizationProvider = organizationProvider;
    this.standardsAdapter = standardsAdapter;
    this.deploymentsAdapter = deploymentsAdapter;
    this.spacesAdapter = spacesAdapter;
  }

  setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentsAdapter = deploymentPort;
  }

  setStandardsPort(standardsAdapter: IStandardsPort): void {
    this.standardsAdapter = standardsAdapter;
  }

  setSpacesPort(spacesAdapter: ISpacesPort): void {
    this.spacesAdapter = spacesAdapter;
  }

  async createDetectionProgram(
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    const usecase = new CreateDetectionProgramUseCase(
      this.detectionProgramService,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async getActiveDetectionProgram(
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    const usecase = new GetActiveDetectionProgramUseCase(
      this.detectionProgramService,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async createNewDetectionProgramVersion(
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    const usecase = new CreateNewDetectionProgramVersionUsecase(
      this.repositories.getDetectionProgramRepository(),
      this.repositories.getActiveDetectionProgramRepository(),
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async listDetectionPrograms(
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    const usecase = new ListDetectionProgramUseCase(
      this.detectionProgramService,
      this.deploymentsAdapter,
      this.getStandardsAdapter(),
      this.spacesAdapter,
      this.gitPort,
    );
    return usecase.execute(command);
  }

  async updateDetectionProgram(
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    const usecase = new UpdateDetectionProgramUseCase(
      this.repositories.getDetectionProgramRepository(),
    );

    return usecase.execute(command);
  }

  async updateActiveDetectionProgram(
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    const usecase = new UpdateActiveDetectionProgramUseCase(
      this.repositories.getActiveDetectionProgramRepository(),
      this.repositories.getDetectionProgramRepository(),
    );
    return usecase.execute(command);
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
    const usecase = new StartGenerationProgramUseCase(
      this.linterDelayedJobs.generateProgramDelayedJob,
      this.getStandardsAdapter(),
      () => this,
    );
    return usecase.execute(command);
  }

  async getAllDetectionProgramsByRule(
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    const usecase = new GetAllDetectionProgramsByRuleUseCase(this.repositories);
    return usecase.execute(command);
  }

  async getDetectionProgramMetadata(
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    const usecase = new GetDetectionProgramMetadataUseCase(this.repositories);
    return usecase.execute(command);
  }

  async copyDetectionProgramsToNewRule(
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse> {
    const usecase = new CopyDetectionProgramsToNewRuleUseCase(
      this.repositories,
    );
    return usecase.execute(command);
  }

  async copyRuleDetectionAssessments(
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse> {
    const usecase = new CopyRuleDetectionAssessmentsUseCase(this.repositories);
    return usecase.execute(command);
  }

  async getDraftDetectionProgramForRule(
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    const usecase = new GetDraftDetectionProgramForRuleUseCase(
      this.detectionProgramService,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async getActiveDetectionProgramForRule(
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    const usecase = new GetActiveDetectionProgramForRuleUseCase(
      this.detectionProgramService,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async startRuleDetectionAssessment(
    command: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment> {
    const usecase = new StartRuleDetectionAssessmentUseCase(
      this.repositories,
      this.linterDelayedJobs,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async updateDetectionProgramStatus(
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    const usecase = new UpdateDetectionProgramStatusUseCase(
      this.repositories,
      this.getStandardsAdapter(),
      this.executeLinterProgramsUseCase,
    );
    return usecase.execute(command);
  }

  async updateRuleDetectionAssessmentAfterUpdate(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    const usecase = new UpdateRuleDetectionStatusAfterUpdateUseCase(
      this.repositories,
      this.getStandardsAdapter(),
      () => this,
    );
    return usecase.execute(command);
  }

  async getRuleDetectionAssessment(
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    const usecase = new GetRuleDetectionAssessmentUseCase(
      this.repositories,
      this.userProvider,
      this.organizationProvider,
    );
    return usecase.execute(command);
  }

  async computeRuleLanguageDetectionStatus(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    const usecase = new ComputeRuleLanguageDetectionStatusUseCase(
      this.repositories,
    );
    return usecase.execute(command);
  }

  async getStandardRulesDetectionStatus(
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    const usecase = new GetStandardRulesDetectionStatusUseCase(
      this.userProvider,
      this.organizationProvider,
      this.repositories,
      this.getStandardsAdapter(),
    );
    return usecase.execute(command);
  }

  async testProgramExecution(
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    const usecase = new TestProgramExecutionUseCase(
      this.repositories,
      this.executeLinterProgramsUseCase,
      this.standardsAdapter,
    );
    return usecase.execute(command);
  }

  private getStandardsAdapter(): IStandardsPort {
    if (!this.standardsAdapter) {
      throw new Error('Standards adapter not configured for Linter adapter');
    }

    return this.standardsAdapter;
  }
}
