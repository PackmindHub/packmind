import { IBaseAdapter } from '@packmind/node-utils';
import { OrganizationId } from '@packmind/types';
import { ISpacesPort } from '@packmind/types';
import { Space, SpaceId } from '@packmind/types';
import type { SpacesHexa } from '../../SpacesHexa';

/**
 * SpacesAdapter - Implements the ISpacesPort interface for cross-domain access
 * Following the Port/Adapter pattern from DDD monorepo architecture standard
 */
export class SpacesAdapter implements IBaseAdapter<ISpacesPort>, ISpacesPort {
  constructor(private readonly hexa: SpacesHexa) {}

  async createSpace(
    name: string,
    organizationId: OrganizationId,
  ): Promise<Space> {
    const spaceService = this.hexa.getSpaceService();
    return spaceService.createSpace(name, organizationId);
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

  /**
   * Initialize the adapter with ports from registry.
   * SpacesAdapter has no port dependencies, so this is a no-op.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_ports: Record<string, unknown>): Promise<void> {
    // No ports needed for SpacesAdapter
  }

  /**
   * Check if the adapter is ready to use.
   * SpacesAdapter is always ready as it has no port dependencies.
   */
  public isReady(): boolean {
    return true;
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ISpacesPort {
    return this as ISpacesPort;
  }
}
