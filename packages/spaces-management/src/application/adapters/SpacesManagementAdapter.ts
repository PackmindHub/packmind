import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesManagementPort,
  CreateSpaceCommand,
  CreateSpaceResponse,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  JoinSpaceCommand,
  JoinSpaceResponse,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '@packmind/types';
import { CreateSpaceUseCase } from '../usecases/CreateSpaceUseCase';
import { MoveArtifactsToSpaceUseCase } from '../usecases/MoveArtifactsToSpaceUseCase';
import { BrowseSpacesUseCase } from '../usecases/BrowseSpacesUseCase';
import { JoinSpaceUseCase } from '../usecases/JoinSpaceUseCase';
import { UpdateSpaceUseCase } from '../usecases/UpdateSpaceUseCase';

/**
 * SpacesManagementAdapter - Implements the ISpacesManagementPort interface for cross-domain access
 * Following the Port/Adapter pattern from DDD monorepo architecture standard
 */
export class SpacesManagementAdapter
  implements IBaseAdapter<ISpacesManagementPort>, ISpacesManagementPort
{
  private accountsPort!: IAccountsPort;
  private spacesPort!: ISpacesPort;
  private standardsPort!: IStandardsPort;
  private skillsPort!: ISkillsPort;
  private recipesPort!: IRecipesPort;
  private eventEmitterService!: PackmindEventEmitterService;

  async createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    const useCase = new CreateSpaceUseCase(this.spacesPort);
    return useCase.execute(command);
  }

  async moveArtifactsToSpace(
    command: MoveArtifactsToSpaceCommand,
  ): Promise<MoveArtifactsToSpaceResponse> {
    const useCase = new MoveArtifactsToSpaceUseCase(
      this.accountsPort,
      this.spacesPort,
      this.standardsPort,
      this.skillsPort,
      this.recipesPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  async browseSpaces(
    command: BrowseSpacesCommand,
  ): Promise<BrowseSpacesResponse> {
    const useCase = new BrowseSpacesUseCase(this.accountsPort, this.spacesPort);
    return useCase.execute(command);
  }

  async joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    const useCase = new JoinSpaceUseCase(
      this.accountsPort,
      this.spacesPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  async updateSpace(command: UpdateSpaceCommand): Promise<UpdateSpaceResponse> {
    const useCase = new UpdateSpaceUseCase(
      this.accountsPort,
      this.spacesPort,
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  /**
   * Initialize the adapter with ports from registry.
   */
  public async initialize(ports: Record<string, unknown>): Promise<void> {
    this.accountsPort = ports[IAccountsPortName] as IAccountsPort;
    this.spacesPort = ports[ISpacesPortName] as ISpacesPort;
    this.standardsPort = ports[IStandardsPortName] as IStandardsPort;
    this.skillsPort = ports[ISkillsPortName] as ISkillsPort;
    this.recipesPort = ports[IRecipesPortName] as IRecipesPort;
    this.eventEmitterService = ports[
      'eventEmitterService'
    ] as PackmindEventEmitterService;
  }

  /**
   * Check if the adapter is ready to use.
   */
  public isReady(): boolean {
    return (
      !!this.accountsPort &&
      !!this.spacesPort &&
      !!this.standardsPort &&
      !!this.skillsPort &&
      !!this.recipesPort &&
      !!this.eventEmitterService
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ISpacesManagementPort {
    return this as ISpacesManagementPort;
  }
}
