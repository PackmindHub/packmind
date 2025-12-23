import { LogLevel, PackmindLogger } from '@packmind/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateNewDetectionProgramVersionCommand,
  ICreateNewDetectionProgramVersion,
} from '@packmind/types';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { IStandardsPort } from '@packmind/types';
import { DetectionProgram, createDetectionProgramId } from '@packmind/types';

export class CreateNewDetectionProgramVersionUsecase implements ICreateNewDetectionProgramVersion {
  constructor(
    private readonly detectionProgramRepository: IDetectionProgramRepository,
    private readonly activeDetectionProgramRepository: IActiveDetectionProgramRepository,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'CreateNewDetectionProgramVersionUsecase',
      LogLevel.INFO,
    ),
  ) {}

  async execute(
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    // Validate input
    if (!command.code || command.code.trim() === '') {
      throw new Error('Code is required');
    }

    const activeDetectionProgram =
      await this.activeDetectionProgramRepository.findById(
        command.activeDetectionProgramId,
      );
    if (!activeDetectionProgram) {
      throw new Error('Detection program not found');
    }

    const rule = await this.standardsAdapter.getRule(
      activeDetectionProgram.ruleId,
    );

    if (!rule) {
      throw new Error('Rule not found');
    }

    const standardVersion = await this.standardsAdapter.getStandardVersion(
      rule.standardVersionId,
    );
    if (!standardVersion) {
      throw new Error('Standard version not found for rule');
    }

    const standard = await this.standardsAdapter.getStandard(
      standardVersion.standardId,
    );
    if (!standard) {
      throw new Error('Standard not found for rule');
    }
    //
    // console.log(standard);
    // console.log(command.organizationId);
    //
    // if (standard.organizationId !== command.organizationId) {
    //   throw new Error('Rule does not belong to user organization');
    // }

    // Handle the case where detectionProgramVersion might be null (draft mode)
    let currentDetectionProgram: DetectionProgram | null = null;
    if (activeDetectionProgram.detectionProgramVersion) {
      currentDetectionProgram = await this.detectionProgramRepository.findById(
        activeDetectionProgram.detectionProgramVersion,
      );
      if (!currentDetectionProgram) {
        throw new Error('Current detection program not found');
      }
    } else if (activeDetectionProgram.detectionProgramDraftVersion) {
      // If no regular version but has draft version, use the draft as reference
      currentDetectionProgram = await this.detectionProgramRepository.findById(
        activeDetectionProgram.detectionProgramDraftVersion,
      );
      if (!currentDetectionProgram) {
        throw new Error('Current draft detection program not found');
      }
    } else {
      throw new Error(
        'Active detection program has no version or draft version',
      );
    }

    const latestVersion =
      await this.detectionProgramRepository.getLatestVersionByRuleIdAndLanguage(
        activeDetectionProgram.ruleId,
        activeDetectionProgram.language,
      );
    const newVersion = latestVersion + 1;

    const newDetectionProgram: DetectionProgram = {
      id: createDetectionProgramId(uuidv4()),
      ruleId: activeDetectionProgram.ruleId,
      code: command.code,
      version: newVersion,
      mode: command.mode || currentDetectionProgram.mode,
      language: activeDetectionProgram.language,
      status: command.status || currentDetectionProgram.status,
      sourceCodeState: command.sourceCodeState || 'AST',
      createdAt: new Date(),
    };

    const createdDetectionProgram =
      await this.detectionProgramRepository.add(newDetectionProgram);

    // Only update the active detection program if explicitly requested
    if (command.updateActiveDetectionProgram) {
      const updatedActiveProgram = {
        ...activeDetectionProgram,
        detectionProgramVersion: createdDetectionProgram.id,
      };
      await this.activeDetectionProgramRepository.updateActiveDetectionProgram(
        updatedActiveProgram,
      );
    }

    return createdDetectionProgram;
  }
}
