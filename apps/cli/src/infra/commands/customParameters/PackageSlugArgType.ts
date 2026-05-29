import { Type } from 'cmd-ts';
import {
  ParsedPackageSlug,
  parsePackageSlug,
} from '../../../domain/entities/PackageSlug';

export const PackageSlugArgType: Type<string, ParsedPackageSlug> = {
  from: async (input) => parsePackageSlug(input),
};
