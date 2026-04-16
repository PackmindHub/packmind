import { IUseCase, PackmindCommand } from '../../UseCase';

export type UpdateUserDisplayNameCommand = PackmindCommand & {
  displayName: string | null;
};

export type UpdateUserDisplayNameResponse = {
  displayName: string | null;
};

export type IUpdateUserDisplayNameUseCase = IUseCase<
  UpdateUserDisplayNameCommand,
  UpdateUserDisplayNameResponse
>;
