import { User, UserId } from '../entities/User';
import { IPublicUseCase } from '@packmind/shared';

export type GetUserByIdCommand = {
  userId: UserId;
};

export type GetUserByIdResponse = {
  user: User | null;
};

export type IGetUserByIdUseCase = IPublicUseCase<
  GetUserByIdCommand,
  GetUserByIdResponse
>;
