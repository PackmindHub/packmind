import { PackmindLogger } from '@packmind/logger';
import {
  IStandardsPort,
  ILinterAstPort,
  ILlmPort,
  AiNotConfigured,
  createOrganizationId,
} from '@packmind/types';
import { GenerateProgramOutput } from '@packmind/types';
import { DetectionProgram } from '@packmind/types';
import { DetectionProgramRuleInput } from '@packmind/types';
import { GenerateRuleDetection } from './generation/GenerateRuleDetection';
import DetectionToolingLogWriter from './log/DetectionToolingLogWriter';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  GenerateProgramJobCommand,
  IGenerateProgramJob,
} from '@packmind/types';

const origin = 'GenerateProgramUseCase';

export class GenerateProgramUseCase implements IGenerateProgramJob {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly linterAstAdapter: ILinterAstPort | null,
    private readonly llmPort: ILlmPort | null,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GenerateProgramJobCommand,
  ): Promise<GenerateProgramOutput> {
    try {
      this.logger.info('Job starting - checking if detection program exists', {
        jobId: command.jobId,
        language: command.language,
      });

      // Fetch rule examples and filter by the target language
      const allRuleExamples = await this.standardsAdapter.getRuleCodeExamples(
        command.ruleId,
      );

      const filteredExamples = allRuleExamples.filter(
        (example) => example.lang === command.language,
      );

      this.logger.info('Rule examples filtered for language', {
        jobId: command.jobId,
        language: command.language,
        totalExamples: allRuleExamples.length,
        filteredExamples: filteredExamples.length,
      });

      // Fetch existing heuristics for this rule and language
      const existingHeuristics = await this.linterRepositories
        .getRuleDetectionHeuristicsRepository()
        .getHeuristicsForRule(command.ruleId, command.language);

      this.logger.info('Existing heuristics check', {
        jobId: command.jobId,
        ruleId: command.ruleId,
        language: command.language,
        heuristicsFound: !!existingHeuristics,
        heuristicsCount: existingHeuristics?.heuristics.length || 0,
      });

      // Ensure detection program exists before continuing
      const detectionProgram = await this.linterRepositories
        .getDetectionProgramRepository()
        .findById(command.detectionProgramId);

      if (!detectionProgram) {
        throw new Error(
          `Detection program ${command.detectionProgramId} not found`,
        );
      }

      this.logger.info('Using existing detection program for generation', {
        jobId: command.jobId,
        detectionProgramId: detectionProgram.id,
        activeDetectionProgramId: command.activeDetectionProgramId,
      });

      // Build detection program rule input
      const detectionProgramRuleInput: DetectionProgramRuleInput = {
        rule: command.rule,
        ruleExamples: filteredExamples,
        language: command.language,
        heuristics: existingHeuristics?.heuristics,
      };

      this.logger.info('Starting program generation', {
        jobId: command.jobId,
        examplesCount: filteredExamples.length,
      });

      // Get AI service for the organization
      if (!this.llmPort) {
        throw new AiNotConfigured(
          'LLM port not configured for program generation',
        );
      }
      const response = await this.llmPort.getLlmForOrganization({
        organizationId: createOrganizationId(command.organizationId),
      });
      if (!response.aiService) {
        this.logger.warn(
          'AI service not configured for organization - cannot generate program',
          {
            organizationId: command.organizationId,
            jobId: command.jobId,
          },
        );
        throw new AiNotConfigured(
          'AI service not configured for this organization',
        );
      }
      const aiService = response.aiService;

      const generateRuleDetection = new GenerateRuleDetection(
        command.jobId,
        detectionProgram.id,
        detectionProgramRuleInput,
        aiService,
        new DetectionToolingLogWriter(
          this.linterRepositories.getDetectionProgramMetadataRepository(),
          detectionProgram.id,
        ),
        this.linterAstAdapter,
      );
      const program: Omit<DetectionProgram, 'version'> & {
        generatedHeuristics?: string[] | null;
      } = await generateRuleDetection.assessDetectionPractice();

      this.logger.info('Program generation completed, returning output', {
        jobId: command.jobId,
      });

      // Return the output with the final code and DetectionProgram ID
      // The DetectionProgram will be updated in the completed step of the delayed job
      const output: GenerateProgramOutput = {
        code: program.code,
        language: command.language,
        status: program.status,
        detectionProgramId: detectionProgram.id,
        mode: program.mode,
        sourceCodeState: program.sourceCodeState,
        activeDetectionProgramId: command.activeDetectionProgramId,
        generatedHeuristics: program.generatedHeuristics ?? null,
      };

      this.logger.info('Job completed', {
        jobId: command.jobId,
        detectionProgramId: output.detectionProgramId,
        activeDetectionProgramId: output.activeDetectionProgramId,
      });
      return output;
    } catch (error) {
      this.logger.error('Failed to generate program', {
        jobId: command.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
