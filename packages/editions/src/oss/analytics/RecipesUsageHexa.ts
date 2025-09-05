import { BaseHexa, HexaRegistry, UserId } from '@packmind/shared';

export class RecipesUsageHexa extends BaseHexa {
  constructor(registry: HexaRegistry) {
    super(registry);
  }

  public async trackRecipeUsage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recipeSlugs: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    aiAgent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: UserId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo?: string,
  ): Promise<never[]> {
    throw new Error(
      'Tracking recipes usage is not available in your version of Packmind. Upgrade to benefit from this feature.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
