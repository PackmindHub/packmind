import { User } from '../entities/User';
import { IPublicUseCase } from '@packmind/shared';

export type GetUserByUsernameCommand = {
  username: string;
};

export type GetUserByUsernameResponse = {
  user: User | null;
};

export type IGetUserByUsernameUseCase = IPublicUseCase<
  GetUserByUsernameCommand,
  GetUserByUsernameResponse
>;
