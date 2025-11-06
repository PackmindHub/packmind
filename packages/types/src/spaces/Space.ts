import { SpaceId } from './SpaceId';
import { OrganizationId } from '../accounts/Organization';

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
};
