import { PackmindCommand } from '../../UseCase';
export type JoinSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type JoinSpaceBySlugCommand = PackmindCommand & {
  spaceSlug: string;
};

export type JoinSpaceResponse = Record<string, never>;
