export type ICheckCliVersionCommand = { currentVersion: string };

export type ICheckCliVersionResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
};

export interface ICheckCliVersionUseCase {
  execute(
    command: ICheckCliVersionCommand,
  ): Promise<ICheckCliVersionResult | null>;
}
