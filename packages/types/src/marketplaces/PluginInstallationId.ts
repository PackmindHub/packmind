import { Branded, brandedIdFactory } from '../brandedTypes';

export type PluginInstallationId = Branded<'PluginInstallationId'>;
export const createPluginInstallationId =
  brandedIdFactory<PluginInstallationId>();
