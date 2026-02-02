export interface ICreatePackageCommand {
  name: string;
  description?: string;
}

export interface ICreatePackageResult {
  packageId: string;
  name: string;
  slug: string;
}

export interface ICreatePackageUseCase {
  execute(command: ICreatePackageCommand): Promise<ICreatePackageResult>;
}
