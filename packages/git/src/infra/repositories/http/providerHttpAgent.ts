import { Agent } from 'https';

/**
 * Ceiling on how many sockets may be open to a git provider at once.
 *
 * Both settings below are load-bearing. `keepAlive` must be passed
 * explicitly: the v19 change that turned it on applies to
 * `https.globalAgent`, while the `Agent` constructor still defaults it to
 * false, so without it this agent pools nothing. And keep-alive alone is not
 * enough, because a socket can only be reused if a free one already exists
 * when a request starts — a fan-out that starts every request in the same
 * tick finds none and pays a TLS handshake per request. The cap is what makes
 * request N+1 wait for one of the N sockets instead.
 *
 * 20 is a starting ceiling, not a tuned one: well under the 100 concurrent
 * requests GitHub documents as the onset of secondary rate limits, high
 * enough not to throttle reads that legitimately fetch several files at once.
 */
export const PROVIDER_MAX_SOCKETS = 20;

/**
 * Module-level on purpose: a repository instance is built per operation, so a
 * pool owned by a client would be empty on every request and the cap would
 * mean nothing. The pool has to outlive the client.
 */
export const providerHttpsAgent = new Agent({
  keepAlive: true,
  maxSockets: PROVIDER_MAX_SOCKETS,
});
