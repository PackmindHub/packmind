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
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
} from '@packmind/types';
import { MoveArtifactsToSpaceUseCase } from '../usecases/MoveArtifactsToSpaceUseCase';

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
