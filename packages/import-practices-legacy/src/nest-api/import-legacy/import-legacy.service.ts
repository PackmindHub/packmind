import { Injectable } from '@nestjs/common';
import { ImportPracticeLegacyHexa } from '../../ImportPracticeLegacyHexa';
import {
  IImportPracticeLegacyPort,
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse,
} from '../../types';

@Injectable()
export class ImportLegacyService {
  constructor(private readonly hexa: ImportPracticeLegacyHexa) {}

  private get adapter(): IImportPracticeLegacyPort {
    return this.hexa.getAdapter();
  }

  async importLegacy(
    command: ImportPracticeLegacyCommand,
  ): Promise<ImportPracticeLegacyResponse> {
    return this.adapter.importPracticeLegacy(command);
  }
}
