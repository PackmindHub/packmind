import { createHash } from 'crypto';

/**
 * The SHA-1 a git provider reports for a blob holding `content`.
 *
 * Git hashes the object, not the file's bytes on their own: the header
 * `blob <byte length>\0` followed by the bytes. Being deterministic, it lets a
 * local hash be compared against the `sha` a tree listing already reported for
 * that path, so an unchanged file never has to be downloaded.
 *
 * **No normalisation is applied**, deliberately. The bytes hashed must be the
 * bytes the caller will write; collapsing CRLF here would make a file that
 * differs only in line endings hash as unchanged while the content we push
 * still differs from the repository's — a missed commit. A caller that wants
 * line endings ignored has to normalise the content itself.
 *
 * The header length counts **bytes, not characters**: a character count would
 * produce a hash git never reports for any multi-byte content.
 */
export function gitBlobSha(content: string): string {
  const contentBytes = Buffer.from(content, 'utf-8');
  const header = Buffer.from(`blob ${contentBytes.length}\0`, 'utf-8');

  return createHash('sha1')
    .update(Buffer.concat([header, contentBytes]))
    .digest('hex');
}
