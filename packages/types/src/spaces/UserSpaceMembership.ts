import { User, UserId } from '../accounts/User';
import { Space } from './Space';
import { SpaceId } from './SpaceId';

export enum UserSpaceRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export type UserSpaceMembership = {
  userId: UserId;
  spaceId: SpaceId;
  role: UserSpaceRole;
  createdBy: UserId;
  updatedBy: UserId;
  user?: User;
  space?: Space;
  createdAt?: Date;
};
