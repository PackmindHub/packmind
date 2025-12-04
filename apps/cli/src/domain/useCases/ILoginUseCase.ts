export type ILoginCommand = {
  host: string;
  code?: string;
};

export type ILoginResult = {
  success: true;
  credentialsPath: string;
};

export interface ILoginUseCase {
  execute(command: ILoginCommand): Promise<ILoginResult>;
}
