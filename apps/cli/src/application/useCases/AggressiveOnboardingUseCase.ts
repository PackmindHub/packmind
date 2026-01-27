import {
  IAggressiveOnboardingCommand,
  IAggressiveOnboardingResult,
  IAggressiveOnboardingUseCase,
} from '../../domain/useCases/IAggressiveOnboardingUseCase';
import { IProjectScannerService } from '../services/ProjectScannerService';
import { IDocumentationScannerService } from '../services/DocumentationScannerService';
import { IStandardsGeneratorService } from '../services/StandardsGeneratorService';
import { ICommandsGeneratorService } from '../services/CommandsGeneratorService';
import { ISkillsGeneratorService } from '../services/SkillsGeneratorService';
import { ISkillsScannerService } from '../services/SkillsScannerService';
import { IContentPreviewService } from '../services/ContentPreviewService';

export class AggressiveOnboardingUseCase implements IAggressiveOnboardingUseCase {
  constructor(
    private readonly projectScanner: IProjectScannerService,
    private readonly documentationScanner: IDocumentationScannerService,
    private readonly standardsGenerator: IStandardsGeneratorService,
    private readonly commandsGenerator: ICommandsGeneratorService,
    private readonly skillsGenerator: ISkillsGeneratorService,
    private readonly skillsScanner: ISkillsScannerService,
    private readonly contentPreview: IContentPreviewService,
  ) {}

  async execute(
    command: IAggressiveOnboardingCommand,
  ): Promise<IAggressiveOnboardingResult> {
    const projectPath = command.projectPath || process.cwd();

    // Step 1: Scan project (read-only)
    const scanResult = await this.projectScanner.scanProject(projectPath);

    // Step 2: Scan existing documentation
    const existingDocs =
      await this.documentationScanner.scanExistingDocumentation(projectPath);

    // Step 3: Scan for existing skills
    const skillsScanResult =
      await this.skillsScanner.scanExistingSkills(projectPath);

    // Step 4: Generate content
    const standards = this.standardsGenerator.generateStandards(
      scanResult,
      existingDocs,
    );
    const commands = this.commandsGenerator.generateCommands(scanResult);
    const skills = this.skillsGenerator.generateSkills(scanResult, projectPath);

    const content = {
      standards,
      commands,
      skills,
      discoveredSkills: skillsScanResult.skills,
    };

    // Step 5: Format preview
    const preview = this.contentPreview.formatPreview(content);

    return {
      content,
      preview,
      scanResult,
    };
  }
}
