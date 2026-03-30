import { Injectable } from '@nestjs/common';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IPlaybookBulkApplyPort,
} from '@packmind/types';
import { InjectPlaybookBulkApplyAdapter } from '../../shared/HexaInjection';

@Injectable()
export class PlaybookService {
  constructor(
    @InjectPlaybookBulkApplyAdapter()
    private readonly adapter: IPlaybookBulkApplyPort,
  ) {}

  async applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse> {
    return this.adapter.applyPlaybook(command);
  }
}
