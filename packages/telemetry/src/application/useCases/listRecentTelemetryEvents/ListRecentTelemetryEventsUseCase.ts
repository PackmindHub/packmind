import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListRecentTelemetryEventsUseCase,
  ListRecentTelemetryEventsCommand,
  ListRecentTelemetryEventsResponse,
} from '@packmind/types';
import { ITelemetryEventRepository } from '../../../domain/repositories/ITelemetryEventRepository';

const origin = 'ListRecentTelemetryEventsUseCase';

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 500;

export class ListRecentTelemetryEventsUseCase
  extends AbstractMemberUseCase<
    ListRecentTelemetryEventsCommand,
    ListRecentTelemetryEventsResponse
  >
  implements IListRecentTelemetryEventsUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly repository: ITelemetryEventRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListRecentTelemetryEventsCommand & MemberContext,
  ): Promise<ListRecentTelemetryEventsResponse> {
    const limit = clampLimit(command.limit);
    const events = await this.repository.listRecent(
      command.organization.id,
      limit,
    );
    return { events };
  }
}

function clampLimit(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.floor(input), MAX_LIST_LIMIT);
}
