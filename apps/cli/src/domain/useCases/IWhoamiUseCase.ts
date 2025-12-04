export type IWhoamiCommand = Record<string, never>;

export type IWhoamiResult =
  | {
      isAuthenticated: true;
      host: string;
      source: string;
      organizationName?: string;
      userName?: string;
      expiresAt?: Date;
      isExpired: boolean;
      credentialsPath: string;
    }
  | {
      isAuthenticated: false;
      credentialsPath: string;
    };

export interface IWhoamiUseCase {
  execute(command: IWhoamiCommand): Promise<IWhoamiResult>;
}
