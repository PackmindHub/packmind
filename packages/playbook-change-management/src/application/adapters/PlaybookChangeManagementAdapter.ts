import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalType,
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IPlaybookChangeManagementPort,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
  RecomputeConflictsCommand,
  RecomputeConflictsResponse,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { PlaybookChangeManagementServices } from '../services/PlaybookChangeManagementServices';
import { ApplyChangeProposalsUseCase } from '../useCases/applyChangeProposals/ApplyChangeProposalsUseCase';
import { ApplyCreationChangeProposalsUseCase } from '../useCases/applyCreationChangeProposals/ApplyCreationChangeProposalsUseCase';
import { CreateChangeProposalUseCase } from '../useCases/createChangeProposal/CreateChangeProposalUseCase';
import { ListChangeProposalsByArtefactUseCase } from '../useCases/listChangeProposalsByArtefact/ListChangeProposalsByArtefactUseCase';
import { ListChangeProposalsBySpaceUseCase } from '../useCases/listChangeProposalsBySpace/ListChangeProposalsBySpaceUseCase';
import { BatchCreateChangeProposalsUseCase } from '../useCases/batchCreateChangeProposals/BatchCreateChangeProposalsUseCase';
import { CheckChangeProposalsUseCase } from '../useCases/checkChangeProposals/CheckChangeProposalsUseCase';
import { RecomputeConflictsUseCase } from '../useCases/recomputeConflicts/RecomputeConflictsUseCase';
import { IChangeProposalValidator } from '../validators/IChangeProposalValidator';
import { CommandChangeProposalValidator } from '../validators/CommandChangeProposalValidator';
import { SkillChangeProposalValidator } from '../validators/SkillChangeProposalValidator';
import { StandardChangeProposalValidator } from '../validators/StandardChangeProposalValidator';
import { RemovalChangeProposalValidator } from '../validators/RemovalChangeProposalValidator';

const origin = 'PlaybookChangeManagementAdapter';

export class PlaybookChangeManagementAdapter
  implements
    IBaseAdapter<IPlaybookChangeManagementPort>,
    IPlaybookChangeManagementPort
{
  private _applyChangeProposals!: ApplyChangeProposalsUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _applyCreationChangeProposals!: ApplyCreationChangeProposalsUseCase;
  private _batchCreateChangeProposals!: BatchCreateChangeProposalsUseCase;
  private _checkChangeProposals!: CheckChangeProposalsUseCase;
  private _createChangeProposal!: CreateChangeProposalUseCase;
  private _listChangeProposalsByArtefact!: ListChangeProposalsByArtefactUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _listChangeProposalsBySpace!: ListChangeProposalsBySpaceUseCase;
  private _recomputeConflicts!: RecomputeConflictsUseCase;

  constructor(
    private readonly services: PlaybookChangeManagementServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse<T>> {
    return this._applyChangeProposals.execute(command);
  }

  async applyCreationChangeProposals(
    command: ApplyCreationChangeProposalsCommand,
  ): Promise<ApplyCreationChangeProposalsResponse> {
    return this._applyCreationChangeProposals.execute(command);
  }

  async batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    return this._batchCreateChangeProposals.execute(command);
  }

  async checkChangeProposals(
    command: CheckChangeProposalsCommand,
  ): Promise<CheckChangeProposalsResponse> {
    return this._checkChangeProposals.execute(command);
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>> {
    return this._createChangeProposal.execute(
      command as CreateChangeProposalCommand<ChangeProposalType>,
    ) as Promise<CreateChangeProposalResponse<T>>;
  }

  async listChangeProposalsByArtefact<
    T extends StandardId | RecipeId | SkillId,
  >(
    command: ListChangeProposalsByArtefactCommand<T>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    return this._listChangeProposalsByArtefact.execute(command);
  }

  async listChangeProposalsBySpace(
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    return this._listChangeProposalsBySpace.execute(command);
  }

  async recomputeConflicts(
    command: RecomputeConflictsCommand,
  ): Promise<RecomputeConflictsResponse> {
    return this._recomputeConflicts.execute(command);
  }

  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [IRecipesPortName]: IRecipesPort;
    [ISpacesPortName]: ISpacesPort;
    [ISkillsPortName]: ISkillsPort;
    [IStandardsPortName]: IStandardsPort;
    [IDeploymentPortName]: IDeploymentPort;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.logger.info('Initializing PlaybookChangeManagementAdapter with ports');

    const accountsPort = ports[IAccountsPortName];

    if (!accountsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IAccountsPort not provided',
      );
    }

    const recipesPort = ports[IRecipesPortName];

    if (!recipesPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IRecipesPort not provided',
      );
    }

    const spacesPort = ports[ISpacesPortName];

    if (!spacesPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: ISpacesPort not provided',
      );
    }

    const skillsPort = ports[ISkillsPortName];

    if (!skillsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: ISkillsPort not provided',
      );
    }

    const standardsPort = ports[IStandardsPortName];

    if (!standardsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IStandardsPort not provided',
      );
    }

    const deploymentPort = ports[IDeploymentPortName];

    if (!deploymentPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IDeploymentPort not provided',
      );
    }

    const { eventEmitterService } = ports;

    if (!eventEmitterService) {
      throw new Error(
        'PlaybookChangeManagementAdapter: PackmindEventEmitterService not provided',
      );
    }

    const changeProposalService = this.services.getChangeProposalService();
    const conflictDetectionService =
      this.services.getConflictDetectionService();

    const validators: IChangeProposalValidator[] = [
      new CommandChangeProposalValidator(recipesPort),
      new SkillChangeProposalValidator(skillsPort),
      new StandardChangeProposalValidator(standardsPort),
      new RemovalChangeProposalValidator(
        standardsPort,
        recipesPort,
        skillsPort,
      ),
    ];

    this._applyChangeProposals = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      deploymentPort,
      changeProposalService,
      eventEmitterService,
    );

    this._applyCreationChangeProposals =
      new ApplyCreationChangeProposalsUseCase(
        accountsPort,
        spacesPort,
        recipesPort,
        standardsPort,
        skillsPort,
        changeProposalService,
        eventEmitterService,
      );

    this._batchCreateChangeProposals = new BatchCreateChangeProposalsUseCase(
      accountsPort,
      this,
      deploymentPort,
    );

    this._checkChangeProposals = new CheckChangeProposalsUseCase(
      accountsPort,
      changeProposalService,
      validators,
    );

    this._createChangeProposal = new CreateChangeProposalUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
      validators,
      eventEmitterService,
    );

    this._listChangeProposalsByArtefact =
      new ListChangeProposalsByArtefactUseCase(
        accountsPort,
        spacesPort,
        standardsPort,
        recipesPort,
        skillsPort,
        deploymentPort,
        changeProposalService,
        conflictDetectionService,
      );

    this._listChangeProposalsBySpace = new ListChangeProposalsBySpaceUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
    );

    this._recomputeConflicts = new RecomputeConflictsUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
      conflictDetectionService,
    );

    this.logger.info(
      'PlaybookChangeManagementAdapter initialized successfully',
    );
  }

  public isReady(): boolean {
    return (
      this._applyChangeProposals !== undefined &&
      this._applyCreationChangeProposals !== undefined &&
      this._batchCreateChangeProposals !== undefined &&
      this._checkChangeProposals !== undefined &&
      this._createChangeProposal !== undefined &&
      this._listChangeProposalsByArtefact !== undefined &&
      this._listChangeProposalsBySpace !== undefined &&
      this._recomputeConflicts !== undefined
    );
  }

  public getPort(): IPlaybookChangeManagementPort {
    return this as IPlaybookChangeManagementPort;
  }
}
