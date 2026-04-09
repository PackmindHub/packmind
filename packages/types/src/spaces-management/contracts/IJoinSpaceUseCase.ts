import { IUseCase, PackmindCommand } from '../../UseCase';

export type JoinSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type JoinSpaceBySlugCommand = PackmindCommand & {
  spaceSlug: string;
};

export type JoinSpaceResponse = Record<string, never>;

export type IJoinSpaceUseCase = IUseCase<JoinSpaceCommand, JoinSpaceResponse>;
