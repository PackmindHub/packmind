export type ILogoutCommand = Record<string, never>;

export type ILogoutResult = {
  hadCredentialsFile: boolean;
  hasEnvVar: boolean;
  credentialsPath: string;
};

export interface ILogoutUseCase {
  execute(command: ILogoutCommand): Promise<ILogoutResult>;
}
