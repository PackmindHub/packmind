import { PackmindCommand } from '../../UseCase';

export type CreateCliLoginCodeCommand = PackmindCommand;

export type CreateCliLoginCodeResponse = {
  code: string;
  expiresAt: Date;
};

export type ICreateCliLoginCodeUseCase = {
  execute(
    command: CreateCliLoginCodeCommand,
  ): Promise<CreateCliLoginCodeResponse>;
};
