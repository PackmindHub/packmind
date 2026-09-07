import { createHash } from 'crypto';

/**
 * The SHA-1 a git provider reports for a blob holding `content`.
 *
 * Git does not hash a file's bytes on their own: it hashes the object, which
 * is the header `blob <byte length>\0` followed by the bytes. The result is
 * deterministic, so hashing locally and comparing against the `sha` a tree
 * listing already reported for that path tells us whether the file changed
 * without downloading it. This is how `git status` stays fast on a large
 * repository.
 *
 * **No normalisation is applied.** The hash is taken over the exact UTF-8
 * bytes the caller intends to write, because those are the bytes the provider
 * will store and therefore the only ones that decide whether the resulting
 * tree differs. Normalising here — collapsing CRLF, say — would make a file
 * whose only difference is its line endings hash as unchanged while the
 * content we would push still differs from the repository's, which is a
 * missed commit rather than a saved one. Callers that genuinely want line
 * endings ignored must normalise the content itself, so that what is hashed
 * and what is written stay the same bytes.
 *
 * The length in the header counts **bytes, not characters**: a multi-byte
 * character makes the two differ, and using the character count would yield a
 * hash git never produces.
 */
export function gitBlobSha(content: string): string {
  const contentBytes = Buffer.from(content, 'utf-8');
  const header = Buffer.from(`blob ${contentBytes.length}\0`, 'utf-8');

  return createHash('sha1')
    .update(Buffer.concat([header, contentBytes]))
    .digest('hex');
}
