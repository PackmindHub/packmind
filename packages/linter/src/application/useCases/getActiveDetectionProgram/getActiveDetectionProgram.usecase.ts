import { LogLevel, PackmindLogger } from '@packmind/logger';
import { ProgrammingLanguage } from '@packmind/types';
import { RuleExample, RuleId } from '@packmind/types';
import {
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramResponse,
  IGetActiveDetectionProgram,
  LanguageDetectionPrograms,
  createActiveDetectionProgramId,
} from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { IStandardsPort } from '@packmind/types';

export class GetActiveDetectionProgramUseCase implements IGetActiveDetectionProgram {
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'GetActiveDetectionProgramUseCase',
      LogLevel.INFO,
    ),
  ) {}

  async execute(
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    try {
      // Validate rule exists
      const rule = await this.standardsAdapter.getRule(command.ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      if (command.language) {
        const activeProgram =
          await this.detectionProgramService.findActiveByRuleIdAndLanguage(
            command.ruleId,
            command.language,
          );

        if (!activeProgram) {
          return { programs: null };
        }

        const activeProgramsWithPrograms =
          await this.detectionProgramService.findActiveByRuleIdWithPrograms(
            command.ruleId,
          );

        const normalizedPrograms = activeProgramsWithPrograms.map(mapProgram);

        const matchingProgram = normalizedPrograms.find(
          (program) => program.language === command.language,
        );

        return { programs: matchingProgram ? [matchingProgram] : null };
      }

      const [activeProgramsWithPrograms, ruleExamples] = await Promise.all([
        this.detectionProgramService.findActiveByRuleIdWithPrograms(
          command.ruleId,
        ),
        this.standardsAdapter.getRuleCodeExamples(command.ruleId),
      ]);

      const normalizedPrograms = activeProgramsWithPrograms.map(mapProgram);
      const programsByLanguage = new Map<
        ProgrammingLanguage,
        LanguageDetectionPrograms
      >();

      for (const program of normalizedPrograms) {
        programsByLanguage.set(program.language, program);
      }

      const languagesWithExamples = this.extractLanguagesWithExamples(
        ruleExamples ?? [],
      );

      const placeholderPrograms = languagesWithExamples
        .filter((language) => !programsByLanguage.has(language))
        .map((language) =>
          this.buildPlaceholderProgram(command.ruleId, language),
        );

      const allPrograms = [...normalizedPrograms, ...placeholderPrograms];

      if (allPrograms.length === 0) {
        return { programs: null };
      }

      // Return all programs as array
      return { programs: allPrograms };
    } catch (error) {
      this.logger.error('Failed to get active detection program', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private extractLanguagesWithExamples(
    examples: RuleExample[],
  ): ProgrammingLanguage[] {
    const languages = new Set<ProgrammingLanguage>();

    for (const example of examples) {
      const hasContent =
        (example.negative && example.negative.trim().length > 0) ||
        (example.positive && example.positive.trim().length > 0);

      if (hasContent) {
        languages.add(example.lang);
      }
    }

    return Array.from(languages);
  }

  private buildPlaceholderProgram(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): LanguageDetectionPrograms {
    return {
      id: createActiveDetectionProgramId(`${String(ruleId)}-${language}`),
      detectionProgramVersion: null,
      detectionProgramDraftVersion: null,
      ruleId,
      language,
      detectionProgram: null,
      draftDetectionProgram: null,
      isExampleOnly: true,
    };
  }
}
const mapProgram = (program: LanguageDetectionPrograms) => ({
  ...program,
  detectionProgram: program.detectionProgram ?? null,
  draftDetectionProgram: program.draftDetectionProgram ?? null,
});
