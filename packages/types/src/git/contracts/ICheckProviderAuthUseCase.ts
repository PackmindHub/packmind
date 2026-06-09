import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type CheckProviderAuthFailureReason =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network';

export type CheckProviderAuthCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
};

export type CheckProviderAuthResponse =
  | { ok: true }
  | { ok: false; reason: CheckProviderAuthFailureReason };

export type ICheckProviderAuthUseCase = IUseCase<
  CheckProviderAuthCommand,
  CheckProviderAuthResponse
>;
