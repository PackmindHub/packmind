import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import {
  useAddArtefactsToPackagesMutation,
  type AddArtefactsToPackagesEntry,
} from '../api/queries/DeploymentsQueries';

/**
 * The package a screen is scoped to, in the URL.
 *
 * One name for two readers, on purpose: the Context rail uses it to say which
 * package the pane is showing, and a create form uses it to say which package
 * the new component joins. Both are the same statement, "the package in
 * question", so they share the parameter rather than inventing a second one
 * that would have to agree with it.
 */
export const PACKAGE_PARAM = 'package';

/** Adds the package to a create route's address. */
export function withPackageParam(href: string, packageId?: PackageId): string {
  return packageId ? `${href}?${PACKAGE_PARAM}=${packageId}` : href;
}

export type PackageArtefacts = Omit<AddArtefactsToPackagesEntry, 'packageId'>;

/**
 * 'not-asked' means the form was opened outside any package, which is the
 * normal case from the per-type pages and not a failure.
 */
export type AttachOutcome = 'attached' | 'failed' | 'not-asked';

/**
 * Puts a freshly created component into the package the form was opened from.
 *
 * Without this, creating from the Context surface produces a component that
 * belongs to nothing: it exists in the space, reaches no repository, and only
 * shows up under the inventory's orphan line. The user asked for a component in
 * this package, so the two calls happen together rather than leaving the second
 * one as homework.
 *
 * It reports rather than throws, because by the time it runs the component is
 * already saved. A failed attach is worth saying out loud and is not worth
 * losing the component over.
 */
export function useCreateIntoPackage() {
  const [searchParams] = useSearchParams();
  const { spaceId } = useCurrentSpace();
  const addArtefacts = useAddArtefactsToPackagesMutation();

  const requested = searchParams.get(PACKAGE_PARAM);
  const packageId = requested ? (requested as PackageId) : null;

  const attachToPackage = useCallback(
    async (artefacts: PackageArtefacts): Promise<AttachOutcome> => {
      if (!packageId || !spaceId) {
        return 'not-asked';
      }

      try {
        const outcomes = await addArtefacts.mutateAsync({
          spaceId,
          entries: [{ packageId, ...artefacts }],
        });
        return outcomes[0]?.ok ? 'attached' : 'failed';
      } catch {
        return 'failed';
      }
    },
    [packageId, spaceId, addArtefacts],
  );

  return { packageId, attachToPackage };
}
