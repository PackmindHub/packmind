import { Injectable } from '@nestjs/common';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IPlaybookChangeApplierPort,
} from '@packmind/types';
import { InjectPlaybookChangeApplierAdapter } from '../../shared/HexaInjection';

@Injectable()
export class PlaybookService {
  constructor(
    @InjectPlaybookChangeApplierAdapter()
    private readonly adapter: IPlaybookChangeApplierPort,
  ) {}

  async applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse> {
    return this.adapter.applyPlaybook(command);
  }
}
