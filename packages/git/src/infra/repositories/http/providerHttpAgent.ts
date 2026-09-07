import { Agent } from 'https';

/**
 * Ceiling on how many sockets we may hold open to a git provider at once.
 *
 * The load-bearing setting here is the ceiling itself, not `keepAlive`. Node
 * has defaulted `https.globalAgent` to `keepAlive: true` since v19 and this
 * project runs 24.x, so connection reuse was never switched off - but reuse
 * can only happen when a free socket already exists at the moment a request
 * starts. A fan-out that starts every request in the same tick finds none, so
 * the agent opens one socket per request and then discards them, largely
 * unused, once `keepAliveMsecs` expires. A publish of a 1,129-file package
 * measured 1,128 TLS handshakes for 1,495 requests - 1.33 requests per
 * handshake - with keep-alive on the whole time.
 *
 * Capping the pool is what turns that around: request N+1 waits for one of
 * the N sockets to come free instead of opening its own, so the handshake is
 * paid once per socket rather than once per request. Passing `keepAlive`
 * explicitly is belt-and-braces - it is already the default - but it records
 * the intent and survives a Node downgrade.
 *
 * 20 is a starting ceiling rather than a tuned one, chosen so that:
 *   - it sits well under the 100 concurrent requests GitHub documents as the
 *     point where secondary rate limits start to bite;
 *   - it is high enough not to throttle the read paths that legitimately
 *     fetch several files at once;
 *   - it is low enough that a fan-out reuses sockets instead of stampeding -
 *     the over-parallelism at 1,128 in flight is what inflated every timing
 *     in the trace and produced 26 transient failures.
 * Re-running the publish reproduction is what should confirm or move it.
 */
export const PROVIDER_MAX_SOCKETS = 20;

/**
 * Shared across every provider client in the process, and deliberately so: a
 * socket pool per client would put each `GithubRepository` on its own pool,
 * and since a repository instance is built per operation, every request would
 * again start with no free socket to reuse. The pool has to outlive the
 * client for the cap to mean anything.
 */
export const providerHttpsAgent = new Agent({
  keepAlive: true,
  maxSockets: PROVIDER_MAX_SOCKETS,
});
