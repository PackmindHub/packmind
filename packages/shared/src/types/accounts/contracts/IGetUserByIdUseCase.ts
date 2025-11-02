import { User, UserId } from '../User';
import { IPublicUseCase } from '../../UseCase';

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
