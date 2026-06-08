import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetLastDeploymentDateByProvidersCommand,
  GetLastDeploymentDateByProvidersResponse,
  IAccountsPort,
  IGetLastDeploymentDateByProvidersUseCase,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'GetLastDeploymentDateByProvidersUseCase';

export class GetLastDeploymentDateByProvidersUseCase
  extends AbstractMemberUseCase<
    GetLastDeploymentDateByProvidersCommand,
    GetLastDeploymentDateByProvidersResponse
  >
  implements IGetLastDeploymentDateByProvidersUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly distributionRepository: IDistributionRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetLastDeploymentDateByProvidersCommand & MemberContext,
  ): Promise<GetLastDeploymentDateByProvidersResponse> {
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
