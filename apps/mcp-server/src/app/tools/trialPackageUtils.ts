import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  RecipeId,
  SpaceId,
  StandardId,
  UserId,
} from '@packmind/types';
import { FastifyInstance } from 'fastify';
import { UserContext } from './types';

export const DEFAULT_PACKAGE_NAME = 'Default';
export const DEFAULT_PACKAGE_DESCRIPTION =
  'Default package for organizing your standards and recipes';

export type ArtifactToAdd = {
  standardId?: StandardId;
  recipeId?: RecipeId;
};

export async function ensureDefaultPackageWithArtifact(
  fastify: FastifyInstance,
  userContext: UserContext,
  spaceId: SpaceId,
  artifact: ArtifactToAdd,
  logger: PackmindLogger,
): Promise<string> {
  const deploymentsHexa = fastify.deploymentsHexa();
  if (!deploymentsHexa) {
    throw new Error('Deployments module not available');
  }

  const deploymentsAdapter = deploymentsHexa.getAdapter();
  const organizationId = createOrganizationId(userContext.organizationId);
  const userId = userContext.userId;

  // List existing packages to check if Default package exists
  const { packages } = await deploymentsAdapter.listPackages({
    userId,
    organizationId,
  });

  const defaultPackage = packages.find(
    (pkg) => pkg.name === DEFAULT_PACKAGE_NAME,
  );

  const artifactType = artifact.standardId ? 'standard' : 'recipe';
  const artifactId = artifact.standardId || artifact.recipeId;

  if (defaultPackage) {
    logger.info(`Default package exists, adding ${artifactType} to it`, {
      packageId: defaultPackage.id,
      packageSlug: defaultPackage.slug,
      [`${artifactType}Id`]: artifactId,
    });

    // Add artifact to existing Default package
    await deploymentsAdapter.addArtefactsToPackage({
      userId,
      organizationId,
      packageId: defaultPackage.id,
      standardIds: artifact.standardId ? [artifact.standardId] : undefined,
      recipeIds: artifact.recipeId ? [artifact.recipeId] : undefined,
    });

    return defaultPackage.slug;
  }

  // Create new Default package with the artifact
  logger.info(`Creating Default package for trial user with ${artifactType}`, {
    spaceId,
    [`${artifactType}Id`]: artifactId,
  });

  const { package: newPackage } = await deploymentsAdapter.createPackage({
    userId,
    organizationId,
    spaceId,
    name: DEFAULT_PACKAGE_NAME,
    description: DEFAULT_PACKAGE_DESCRIPTION,
    recipeIds: artifact.recipeId ? [artifact.recipeId] : [],
    standardIds: artifact.standardId ? [artifact.standardId] : [],
  });

  logger.info('Default package created successfully', {
    packageId: newPackage.id,
    packageSlug: newPackage.slug,
    [`${artifactType}Id`]: artifactId,
  });

  return newPackage.slug;
}

export function buildTrialInstallPrompt(packageSlug: string): string {
  return `**IMPORTANT: You MUST now call packmind_install_package with packageSlugs: ["${packageSlug}"] to deploy it to the user's local environment. This is a required step - the artifact will not be available to the user until you complete this action.**`;
}

export async function isTrialUser(
  fastify: FastifyInstance,
  userId: UserId,
): Promise<boolean> {
  const accountsAdapter = fastify.accountsHexa().getAdapter();
  const user = await accountsAdapter.getUserById(userId);
  return user?.trial === true;
}

const TRIAL_ACTIVATION_PROMPT_DAYS = 3;

export async function getTrialUserCreatedAt(
  fastify: FastifyInstance,
  userId: UserId,
): Promise<Date | null> {
  const accountsAdapter = fastify.accountsHexa().getAdapter();
  const user = await accountsAdapter.getUserById(userId);
  if (!user?.trial || !user.createdAt) {
    return null;
  }
  return user.createdAt;
}

export function isTrialOlderThanDays(createdAt: Date, days: number): boolean {
  const now = new Date();
  const diffInMs = now.getTime() - createdAt.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays > days;
}

export function buildTrialActivationPrompt(): string {
  return `**IMPORTANT: After completing the install_package call, you MUST ask the user if they want to activate their Packmind account.** Explain that by running \`packmind_generate_trial_activation_url\`, they can:
- Collaborate with colleagues on standards and recipes
- Easily deploy standards/recipes to other repositories
- Unlock the full Packmind experience`;
}

export async function shouldPromptForTrialActivation(
  fastify: FastifyInstance,
  userId: UserId,
): Promise<boolean> {
  const createdAt = await getTrialUserCreatedAt(fastify, userId);
  if (!createdAt) {
    return false;
  }
  return isTrialOlderThanDays(createdAt, TRIAL_ACTIVATION_PROMPT_DAYS);
}
