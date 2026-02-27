import { RecipeId, PackageId } from '@packmind/types';

export interface CreateCommandOptions {
  name: string;
  content: string;
  summary?: string;
  baseUrl?: string;
  authCookie: string;
  organizationId: string;
  spaceId: string;
}

export interface CreatePackageOptions {
  name: string;
  description?: string;
  recipeIds?: RecipeId[];
  baseUrl?: string;
  authCookie: string;
  organizationId: string;
  spaceId: string;
}

export interface CommandResponse {
  id: RecipeId;
  name: string;
  slug: string;
  content: string;
}

export interface PackageResponse {
  id: PackageId;
  name: string;
  slug: string;
}

/**
 * Creates a command (recipe) via the API.
 *
 * @param opts - Command creation options
 * @returns Created command data
 */
export async function createCommand(
  opts: CreateCommandOptions,
): Promise<CommandResponse> {
  const baseUrl = opts.baseUrl || 'http://localhost:4200';

  const response = await fetch(
    `${baseUrl}/api/v0/organizations/${opts.organizationId}/spaces/${opts.spaceId}/recipes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: opts.authCookie,
      },
      body: JSON.stringify({
        name: opts.name,
        content: opts.content,
        summary: opts.summary || `Command: ${opts.name}`,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create command: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

/**
 * Creates a package via the API.
 *
 * @param opts - Package creation options
 * @returns Created package data
 */
export async function createPackage(
  opts: CreatePackageOptions,
): Promise<PackageResponse> {
  const baseUrl = opts.baseUrl || 'http://localhost:4200';

  const response = await fetch(
    `${baseUrl}/api/v0/organizations/${opts.organizationId}/spaces/${opts.spaceId}/packages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: opts.authCookie,
      },
      body: JSON.stringify({
        name: opts.name,
        description: opts.description || `Package: ${opts.name}`,
        recipeIds: opts.recipeIds || [],
        standardIds: [],
        skillIds: [],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create package: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}
