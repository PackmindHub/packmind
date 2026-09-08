import { PackmindCommand } from '../../UseCase';
import { Space } from '../Space';

export type GetDefaultSpaceCommand = PackmindCommand;
export type GetDefaultSpaceResponse = { defaultSpace: Space };
