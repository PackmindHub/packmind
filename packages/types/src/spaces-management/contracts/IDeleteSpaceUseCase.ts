import { PackmindCommand } from '../../UseCase';
export type DeleteSpaceCommand = PackmindCommand & { spaceId: string };
export type DeleteSpaceResponse = Record<string, never>;
