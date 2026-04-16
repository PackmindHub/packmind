import { OrganizationId, Space, SpaceId } from '@packmind/types';

export interface ISpaceRepository {
  add(space: Space): Promise<Space>;
  findById(id: SpaceId): Promise<Space | null>;
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Space[]>;
  list(): Promise<Space[]>;
  updateFields(
    id: SpaceId,
    fields: Partial<Pick<Space, 'name' | 'slug' | 'type' | 'color'>>,
  ): Promise<Space>;
  deleteById(id: SpaceId, deletedBy?: string): Promise<void>;
}
