import { IBaseAdapter } from '@packmind/node-utils';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse,
  IAccountsPort,
  IAccountsPortName,
  IEventTrackingPort,
  IEventTrackingPortName,
  ISpacesPort,
  ListUserSpacesCommand,
  ListUserSpacesResponse,
  OrganizationId,
  Space,
  SpaceId,
} from '@packmind/types';
import type { SpacesHexa } from '../../SpacesHexa';
import { CreateSpaceUseCase } from '../usecases/CreateSpaceUseCase';
import { GetDefaultSpaceUseCase } from '../usecases/GetDefaultSpaceUseCase';
import { ListUserSpacesUseCase } from '../usecases/ListUserSpacesUseCase';

/**
 * SpacesAdapter - Implements the ISpacesPort interface for cross-domain access
 * Following the Port/Adapter pattern from DDD monorepo architecture standard
 */
export class SpacesAdapter implements IBaseAdapter<ISpacesPort>, ISpacesPort {
  private accountsPort!: IAccountsPort;
  private eventTrackingPort!: IEventTrackingPort;

  constructor(private readonly hexa: SpacesHexa) {}

  async createDefaultSpace(organizationId: OrganizationId): Promise<Space> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.createDefaultSpace(organizationId);
  }

  async createSpace(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    const spaceService = this.hexa.getSpaceService();
    const useCase = new CreateSpaceUseCase(
      spaceService,
      this.accountsPort,
      this.eventTrackingPort,
    );
    return useCase.execute(command);
  }

  async listSpacesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Space[]> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.listSpacesByOrganization(organizationId);
  }

  async getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceBySlug(slug, organizationId);
  }

  async getSpaceById(spaceId: SpaceId): Promise<Space | null> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.getSpaceById(spaceId);
  }

  async listUserSpaces(
    command: ListUserSpacesCommand,
  ): Promise<ListUserSpacesResponse> {
    const spaceService = this.hexa.getSpaceService();
    const useCase = new ListUserSpacesUseCase(spaceService);
    return useCase.execute(command);
  }

  async getDefaultSpace(
    command: GetDefaultSpaceCommand,
  ): Promise<GetDefaultSpaceResponse> {
    const spaceService = this.hexa.getSpaceService();
    const useCase = new GetDefaultSpaceUseCase(spaceService, this.accountsPort);
    return useCase.execute(command);
  }

  /**
   * Initialize the adapter with ports from registry.
   */
  public async initialize(ports: Record<string, unknown>): Promise<void> {
    this.accountsPort = ports[IAccountsPortName] as IAccountsPort;
    this.eventTrackingPort = ports[
      IEventTrackingPortName
    ] as IEventTrackingPort;
  }

  /**
   * Check if the adapter is ready to use.
   */
  public isReady(): boolean {
    return !!this.accountsPort && !!this.eventTrackingPort;
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ISpacesPort {
    return this as ISpacesPort;
  }
}
