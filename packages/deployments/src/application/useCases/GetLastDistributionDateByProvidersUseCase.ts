import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetLastDistributionDateByProvidersCommand,
  GetLastDistributionDateByProvidersResponse,
  IAccountsPort,
  IGetLastDistributionDateByProvidersUseCase,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'GetLastDistributionDateByProvidersUseCase';

export class GetLastDistributionDateByProvidersUseCase
  extends AbstractMemberUseCase<
    GetLastDistributionDateByProvidersCommand,
    GetLastDistributionDateByProvidersResponse
  >
  implements IGetLastDistributionDateByProvidersUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly distributionRepository: IDistributionRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetLastDistributionDateByProvidersCommand & MemberContext,
  ): Promise<GetLastDistributionDateByProvidersResponse> {
    const datesByProviderId: Record<string, string> = {};

    if (command.providerIds.length === 0) {
      return { datesByProviderId };
    }

    const dates =
      await this.distributionRepository.findLastSuccessfulDistributionDateByProviderIds(
        command.organization.id,
        command.providerIds,
      );

    for (const [providerId, date] of dates) {
      datesByProviderId[providerId] = date;
    }

    return { datesByProviderId };
  }
}
