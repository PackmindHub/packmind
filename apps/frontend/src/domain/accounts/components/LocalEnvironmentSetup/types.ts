export type OsType = 'macos-linux' | 'windows';
export type AuthMethod = 'login-command' | 'api-key';

export interface IInstallCliStepProps {
  loginCode: string | null;
  isGeneratingCode: boolean;
  codeExpiresAt?: string | Date;
  onRegenerateCode: () => void;
}

export interface ISectionCardProps {
  title: string;
  description: string;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export interface IOsRadioSelectorProps {
  value: OsType;
  onChange: (os: OsType) => void;
}

export interface IAuthMethodSelectorProps {
  value: AuthMethod;
  onChange: (method: AuthMethod) => void;
}
