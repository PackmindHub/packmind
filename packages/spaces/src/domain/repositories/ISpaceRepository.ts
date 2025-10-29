import { OrganizationId } from '@packmind/shared/types';
import { Space, SpaceId } from '../entities/Space';

export interface ISpaceRepository {
  add(space: Space): Promise<Space>;
  findById(id: SpaceId): Promise<Space | null>;
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Space[]>;
  list(): Promise<Space[]>;
}
