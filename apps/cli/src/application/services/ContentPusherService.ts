import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IGeneratedStandard } from './StandardsGeneratorService';
import { IGeneratedCommand } from './CommandsGeneratorService';

export interface IContentPushResult {
  standardsCreated: number;
  commandsCreated: number;
  errors: string[];
  createdStandards: Array<{ id: string; name: string }>;
  createdCommands: Array<{ id: string; name: string; slug: string }>;
}

export interface IContentPusherService {
  pushContent(
    standards: IGeneratedStandard[],
    commands: IGeneratedCommand[],
  ): Promise<IContentPushResult>;
}

export class ContentPusherService implements IContentPusherService {
  constructor(private readonly gateway: IPackmindGateway) {}

  async pushContent(
    standards: IGeneratedStandard[],
    commands: IGeneratedCommand[],
  ): Promise<IContentPushResult> {
    const result: IContentPushResult = {
      standardsCreated: 0,
      commandsCreated: 0,
      errors: [],
      createdStandards: [],
      createdCommands: [],
    };

    // Get global space ID
    let spaceId: string;
    try {
      const space = await this.gateway.getGlobalSpace();
      spaceId = space.id;
    } catch (error) {
      result.errors.push(
        `Failed to get global space: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }

    // Push standards
    for (const standard of standards) {
      try {
        const createdStandard = await this.pushStandard(spaceId, standard);
        result.createdStandards.push(createdStandard);
        result.standardsCreated++;
      } catch (error) {
        result.errors.push(
          `Failed to create standard "${standard.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Push commands
    for (const command of commands) {
      try {
        const createdCommand = await this.pushCommand(spaceId, command);
        result.createdCommands.push(createdCommand);
        result.commandsCreated++;
      } catch (error) {
        result.errors.push(
          `Failed to create command "${command.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return result;
  }

  private async pushStandard(
    spaceId: string,
    standard: IGeneratedStandard,
  ): Promise<{ id: string; name: string }> {
    // Create standard without examples first
    const createdStandard = await this.gateway.createStandardInSpace(spaceId, {
      name: standard.name,
      description: standard.description,
      scope: standard.summary, // Using summary as scope since that's what the API expects
      rules: standard.rules.map((r) => ({ content: r.content })),
    });

    // Add examples to rules if any
    const rulesWithExamples = standard.rules.filter((r) => r.examples);

    if (rulesWithExamples.length > 0) {
      const createdRules = await this.gateway.getRulesForStandard(
        spaceId,
        createdStandard.id,
      );

      // Match rules by index and add examples
      for (let i = 0; i < standard.rules.length; i++) {
        const rule = standard.rules[i];
        if (rule.examples && createdRules[i]) {
          try {
            await this.gateway.addExampleToRule(
              spaceId,
              createdStandard.id,
              createdRules[i].id,
              rule.examples,
            );
          } catch {
            // Example creation failure doesn't fail the whole standard
          }
        }
      }
    }

    return createdStandard;
  }

  private async pushCommand(
    spaceId: string,
    command: IGeneratedCommand,
  ): Promise<{ id: string; name: string; slug: string }> {
    return this.gateway.createCommand(spaceId, {
      name: command.name,
      summary: command.summary,
      whenToUse: command.whenToUse,
      contextValidationCheckpoints: command.contextValidationCheckpoints,
      steps: command.steps,
    });
  }
}
