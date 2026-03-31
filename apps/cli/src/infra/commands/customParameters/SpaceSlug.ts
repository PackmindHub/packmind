import { Type } from 'cmd-ts';

// Supports both @global or global
export const SpaceSlug: Type<string, string> = {
  from: async (input) => {
    return input.startsWith('@') ? input.slice(1) : input;
  },
};
