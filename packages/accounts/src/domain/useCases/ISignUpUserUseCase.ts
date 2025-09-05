import { User } from '../entities/User';
import { IPublicUseCase } from '@packmind/shared';
import { OrganizationId } from '../entities/Organization';

export type SignUpUserCommand = {
  username: string;
  password: string;
  organizationId: OrganizationId;
};
export type ISignUpUserUseCase = IPublicUseCase<SignUpUserCommand, User>;
