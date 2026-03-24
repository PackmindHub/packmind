import { loadApiKey, decodeApiKey } from './credentials';

export type UrlBuilder = (
  spaceSlug: string,
  artifactId: string,
) => string | null;
type ArtifactPathBuilder = (artifactId: string) => string;

export function resolveUrlBuilder(
  buildArtifactPath: ArtifactPathBuilder,
): UrlBuilder {
  const apiKey = loadApiKey();
  if (!apiKey) return () => null;
  const decoded = decodeApiKey(apiKey);
  const orgSlug = decoded?.jwt?.organization?.slug;
  if (!decoded?.host || !orgSlug) return () => null;
  return (spaceSlug: string, artifactId: string) =>
    `${decoded.host}/org/${orgSlug}/space/${spaceSlug}/${buildArtifactPath(artifactId)}`;
}
