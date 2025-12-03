import { PackmindLogger } from '@packmind/logger';
import {
  ICreateCliLoginCodeUseCase,
  CreateCliLoginCodeCommand,
  CreateCliLoginCodeResponse,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ICliLoginCodeRepository } from '../../../domain/repositories/ICliLoginCodeRepository';
import {
  createCliLoginCodeId,
  generateCliLoginCode,
  CLI_LOGIN_CODE_EXPIRATION_MINUTES,
} from '../../../domain/entities/CliLoginCode';

const origin = 'CreateCliLoginCodeUseCase';

export class CreateCliLoginCodeUseCase implements ICreateCliLoginCodeUseCase {
  constructor(
    private readonly cliLoginCodeRepository: ICliLoginCodeRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CreateCliLoginCodeCommand,
  ): Promise<CreateCliLoginCodeResponse> {
    const code = generateCliLoginCode();
    const expiresAt = new Date(
      Date.now() + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000,
    );

    const cliLoginCode = await this.cliLoginCodeRepository.add({
      id: createCliLoginCodeId(uuidv4()),
      code,
      userId: createUserId(command.userId),
      organizationId: createOrganizationId(command.organizationId),
      expiresAt,
    });

    this.logger.info('CLI login code created', {
      userId: command.userId,
      organizationId: command.organizationId,
    });

    return {
      code: cliLoginCode.code as string,
      expiresAt,
    };
  }
}
