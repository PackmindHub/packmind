import { IPublicUseCase } from '../../UseCase';

export type CheckEmailAvailabilityCommand = {
  email: string;
};

export type CheckEmailAvailabilityResponse = {
  available: boolean;
};

export type ICheckEmailAvailabilityUseCase = IPublicUseCase<
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse
>;
