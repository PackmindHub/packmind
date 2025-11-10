import { PackmindLogger } from '@packmind/logger';
import {
  ILinterPort,
  IStandardsPort,
  DetectionStatus,
  Rule,
  RuleExample,
  RuleId,
  ProgrammingLanguage,
  ActiveDetectionProgram,
  DetectionModeEnum,
  DetectionProgram,
  LanguageDetectionPrograms,
  CreateDetectionProgramCommand,
  CreateNewDetectionProgramVersionCommand,
  UpdateActiveDetectionProgramCommand,
  StartProgramGenerationCommand,
  StartProgramGenerationResponse,
  GenerateProgramInput,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import {
  NoExamplesForProgramGenerationError,
  NoValidLanguagesForProgramGenerationError,
  RuleNotFoundForProgramGenerationError,
  StandardNotFoundForProgramGenerationError,
} from './errors';
import { GenerateProgramDelayedJob } from '../generateProgramUseCase/GenerateProgramDelayedJob';

const origin = 'StartGenerationProgramUseCase';

export class StartGenerationProgramUseCase {
  constructor(
    private readonly generateProgramDelayedJob: GenerateProgramDelayedJob,
    private readonly standardsAdapter: IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: StartProgramGenerationCommand,
  ): Promise<StartProgramGenerationResponse> {
    this.logger.info('Starting program generation flow', {
      organizationId: command.organizationId,
      userId: command.userId,
      ruleId: command.ruleId,
      language: command.language,
    });

    try {
      const organizationId = createOrganizationId(command.organizationId);

      // Fetch the rule first to get standardVersionId
      const rule = await this.standardsAdapter.getRule(command.ruleId);

      if (!rule) {
        throw new RuleNotFoundForProgramGenerationError(command.ruleId);
      }

      // Get the standard version to derive the standardId
      const standardVersion = await this.standardsAdapter.getStandardVersion(
        rule.standardVersionId,
      );

      if (!standardVersion) {
        throw new Error(
          `Standard version with id ${String(
            rule.standardVersionId,
          )} not found for rule ${String(command.ruleId)}`,
        );
      }

      // Fetch the standard using the derived standardId
      const standard = await this.standardsAdapter.getStandard(
        standardVersion.standardId,
      );

      if (!standard) {
        throw new StandardNotFoundForProgramGenerationError(
          standardVersion.standardId,
        );
      }

      // Note: Organization validation should be done at a higher level
      // Standards are now scoped to spaces, not directly to organizations

      // Fetch all rule examples
      const allRuleExamples = await this.standardsAdapter.getRuleCodeExamples(
        command.ruleId,
      );

      if (!allRuleExamples || allRuleExamples.length === 0) {
        throw new NoExamplesForProgramGenerationError(command.ruleId);
      }

      // Group examples by language
      const examplesByLanguage = this.groupExamplesByLanguage(allRuleExamples);

      // Filter languages with at least one non-empty negative example
      const validLanguages = this.getValidLanguages(examplesByLanguage);

      if (validLanguages.length === 0) {
        throw new NoValidLanguagesForProgramGenerationError(command.ruleId);
      }

      this.logger.info('Valid languages detected for program generation', {
        languages: validLanguages,
        selectedLanguage: command.language,
        totalLanguages: examplesByLanguage.size,
      });

      const targetLanguages = command.language
        ? this.filterRequestedLanguage(
            validLanguages,
            command.language,
            command.ruleId,
          )
        : validLanguages;

      // Create job for each valid language
      const jobIds: string[] = [];
      const userId = createUserId(command.userId);
      const linterAdapter = this.getLinterAdapter();

      for (const language of targetLanguages) {
        const { detectionProgram, activeDetectionProgramId } =
          await this.prepareDetectionProgram({
            linterAdapter,
            command,
            language,
            rule,
          });

        this.logger.info('Detection program prepared for job registration', {
          detectionProgramId: detectionProgram.id,
          activeDetectionProgramId,
          language,
        });

        const input: GenerateProgramInput = {
          value: `Generating program for rule "${rule.content}" in standard "${standard.name}" (ID: ${standard.id}) for language: ${language}`,
          rule,
          organizationId,
          userId,
          language,
          detectionProgramId: detectionProgram.id,
          activeDetectionProgramId,
        };

        const jobId = await this.generateProgramDelayedJob.addJob(input);
        jobIds.push(jobId);

        this.logger.info('Program generation job submitted for language', {
          jobId,
          language,
          standardId: standard.id,
          ruleId: rule.id,
        });
      }

      const languagesList = targetLanguages.join(', ');
      const message = `Created ${jobIds.length} program generation job${
        jobIds.length > 1 ? 's' : ''
      } for rule "${rule.content}" in standard "${
        standard.name
      }" for language${targetLanguages.length > 1 ? 's' : ''}: ${languagesList}`;

      this.logger.info('All program generation jobs submitted', {
        jobIds,
        languages: targetLanguages,
        standardId: standard.id,
        ruleId: rule.id,
      });

      return { message };
    } catch (error) {
      this.logger.error('Failed to start program generation', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async prepareDetectionProgram({
    linterAdapter,
    command,
    language,
    rule,
  }: {
    linterAdapter: ILinterPort;
    command: StartProgramGenerationCommand;
    language: ProgrammingLanguage;
    rule: Rule;
  }): Promise<{
    detectionProgram: DetectionProgram;
    activeDetectionProgramId: ActiveDetectionProgram['id'];
  }> {
    const existingPrograms = await linterAdapter.getActiveDetectionProgram({
      ruleId: command.ruleId,
      language,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const matchingProgram = existingPrograms.programs?.find(
      (program) => program.language === language,
    );

    if (matchingProgram) {
      this.logger.info('Existing active detection program found', {
        activeDetectionProgramId: matchingProgram.id,
        language,
      });

      const createNewVersionCommand: CreateNewDetectionProgramVersionCommand = {
        activeDetectionProgramId: matchingProgram.id,
        code: this.getInProgressPlaceholder(rule),
        mode: DetectionModeEnum.SINGLE_AST,
        status: DetectionStatus.IN_PROGRESS,
        organizationId: command.organizationId,
        userId: command.userId,
      };

      const detectionProgram =
        await linterAdapter.createNewDetectionProgramVersion(
          createNewVersionCommand,
        );

      await this.ensureDraftDetectionProgram({
        linterAdapter,
        activeProgram: matchingProgram,
        detectionProgramId: detectionProgram.id,
        command,
      });

      return {
        detectionProgram,
        activeDetectionProgramId: matchingProgram.id,
      };
    }

    this.logger.info(
      'No active detection program found, creating a new one for generation',
      {
        ruleId: command.ruleId,
        language,
      },
    );

    const createDetectionProgramCommand: CreateDetectionProgramCommand = {
      ruleId: command.ruleId,
      code: this.getInProgressPlaceholder(rule),
      language,
      mode: DetectionModeEnum.SINGLE_AST,
      status: DetectionStatus.IN_PROGRESS,
      organizationId: command.organizationId,
      userId: command.userId,
      mustBeDraftVersion: true,
    };

    const detectionProgram = await linterAdapter.createDetectionProgram(
      createDetectionProgramCommand,
    );

    const refreshedPrograms = await linterAdapter.getActiveDetectionProgram({
      ruleId: command.ruleId,
      language,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const createdProgram = refreshedPrograms.programs?.find(
      (program) => program.language === language,
    );

    if (!createdProgram) {
      throw new Error(
        'Failed to retrieve active detection program after creation',
      );
    }

    await this.ensureDraftDetectionProgram({
      linterAdapter,
      activeProgram: createdProgram,
      detectionProgramId: detectionProgram.id,
      command,
    });

    return {
      detectionProgram,
      activeDetectionProgramId: createdProgram.id,
    };
  }

  private async ensureDraftDetectionProgram({
    linterAdapter,
    activeProgram,
    detectionProgramId,
    command,
  }: {
    linterAdapter: ILinterPort;
    activeProgram: LanguageDetectionPrograms;
    detectionProgramId: DetectionProgram['id'];
    command: StartProgramGenerationCommand;
  }): Promise<void> {
    if (activeProgram.detectionProgramDraftVersion === detectionProgramId) {
      return;
    }

    const updateActiveDetectionProgramCommand: UpdateActiveDetectionProgramCommand =
      {
        activeDetectionProgram: this.toActiveDetectionProgram(activeProgram),
        newDetectionProgramDraftVersion: detectionProgramId,
        organizationId: command.organizationId,
        userId: command.userId,
      };

    await linterAdapter.updateActiveDetectionProgram(
      updateActiveDetectionProgramCommand,
    );
  }

  private toActiveDetectionProgram(
    program: LanguageDetectionPrograms,
  ): ActiveDetectionProgram {
    const {
      id,
      detectionProgramVersion,
      detectionProgramDraftVersion,
      ruleId,
      language,
    } = program;

    return {
      id,
      detectionProgramVersion,
      detectionProgramDraftVersion,
      ruleId,
      language,
    };
  }

  private getInProgressPlaceholder(rule: Rule): string {
    return `// Program generation in progress for rule: ${rule.content}`;
  }

  private groupExamplesByLanguage(
    examples: RuleExample[],
  ): Map<ProgrammingLanguage, RuleExample[]> {
    const examplesByLanguage = new Map<ProgrammingLanguage, RuleExample[]>();

    for (const example of examples) {
      const existing = examplesByLanguage.get(example.lang) || [];
      existing.push(example);
      examplesByLanguage.set(example.lang, existing);
    }

    return examplesByLanguage;
  }

  private getValidLanguages(
    examplesByLanguage: Map<ProgrammingLanguage, RuleExample[]>,
  ): ProgrammingLanguage[] {
    return Array.from(examplesByLanguage.entries())
      .filter(([, examples]) =>
        examples.some((ex) => ex.negative && ex.negative.trim().length > 0),
      )
      .map(([lang]) => lang);
  }

  private filterRequestedLanguage(
    validLanguages: ProgrammingLanguage[],
    requestedLanguage: ProgrammingLanguage,
    ruleId: RuleId,
  ): ProgrammingLanguage[] {
    if (!validLanguages.includes(requestedLanguage)) {
      throw new NoValidLanguagesForProgramGenerationError(ruleId);
    }

    return [requestedLanguage];
  }
}
