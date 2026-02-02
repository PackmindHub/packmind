import { ICreatePackageUseCase } from '../../domain/useCases/ICreatePackageUseCase';

export interface ICreatePackageHandlerResult {
  success: boolean;
  slug?: string;
  name?: string;
  packageId?: string;
  error?: string;
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

    return {
      success: true,
      slug: result.slug,
      name: result.name,
      packageId: result.packageId,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
