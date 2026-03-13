import { SpaceId } from './SpaceId';
import { OrganizationId } from '../accounts/Organization';

export enum SpaceType {
  open = 'open',
  restricted = 'restricted',
  private = 'private',
}

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  type: SpaceType;
  organizationId: OrganizationId;
  isDefaultSpace: boolean;
};
