import { OrganizationId, Space, SpaceId, SpaceType } from '@packmind/types';

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
    fields: { name?: string; slug?: string; type?: SpaceType },
  ): Promise<Space>;
}
