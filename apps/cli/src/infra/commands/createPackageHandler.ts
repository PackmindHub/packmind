import { ICreatePackageUseCase } from '../../domain/useCases/ICreatePackageUseCase';
import { loadApiKey, decodeApiKey } from '../utils/credentials';

export interface ICreatePackageHandlerResult {
  success: boolean;
  slug?: string;
  packageName?: string;
  packageId?: string;
  webappUrl?: string;
  error?: string;
}

function buildWebappUrl(
  host: string,
  orgSlug: string,
  packageId: string,
): string {
  return `${host}/org/${orgSlug}/space/global/packages/${packageId}`;
}

export async function createPackageHandler(
  name: string,
  description: string | undefined,
  useCase: ICreatePackageUseCase,
): Promise<ICreatePackageHandlerResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Package name is required' };
  }

  try {
    const result = await useCase.execute({
      name: trimmedName,
      description,
    });

    // Try to build webapp URL from credentials
    let webappUrl: string | undefined;
    const apiKey = loadApiKey();
    if (apiKey) {
      const decoded = decodeApiKey(apiKey);
      if (decoded?.host && decoded?.jwt?.organization?.slug) {
        webappUrl = buildWebappUrl(
          decoded.host,
          decoded.jwt.organization.slug,
          result.packageId,
        );
      }
    }

    return {
      success: true,
      slug: result.slug,
      packageName: result.name,
      packageId: result.packageId,
      webappUrl,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
