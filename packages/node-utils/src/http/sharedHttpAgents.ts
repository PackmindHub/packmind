import http from 'node:http';
import https from 'node:https';

/**
 * How long an idle socket is kept for reuse.
 *
 * Node has pooled outbound connections by default since v19 — the global agent
 * ships `keepAlive: true` — but it drops a free socket after 5 seconds. That is
 * long enough for a burst (a publish loop fetching file after file reuses one
 * socket already) and far too short for everything else: any call to a provider
 * that arrives more than five seconds after the last one pays a DNS lookup, a
 * TCP handshake and a TLS handshake before sending a byte.
 *
 * 30 seconds sits comfortably under the common server-side keep-alive — nginx
 * defaults to 75s, AWS ALB to 60s — so we close first and avoid racing the peer
 * for the socket. Leaving this unset would be worse than the default, not
 * better: free sockets would never expire on our side, maximising the chance of
 * writing a request into a connection the peer has already torn down.
 */
export const HTTP_KEEP_ALIVE_TIMEOUT_MS = 30_000;

/**
 * Per-origin, not global — so this is a ceiling on concurrent connections to
 * api.github.com, not across all hosts. Generous enough that a provider's own
 * rate limits bind long before this does.
 */
export const HTTP_MAX_SOCKETS = 64;

const agentOptions = {
  keepAlive: true,
  timeout: HTTP_KEEP_ALIVE_TIMEOUT_MS,
  maxSockets: HTTP_MAX_SOCKETS,
  // Hand back the most recently used socket, which is the one least likely to
  // have been reaped by the peer. This is already Node's default; it is spelled
  // out because it is the reason a long keep-alive window is safe.
  scheduling: 'lifo' as const,
};

/**
 * Shared across every outbound axios client in the API, so that connections are
 * pooled per origin rather than per client object. Deliberately module-level
 * singletons with no dependency on `Configuration`: reading config is async and
 * may call out to Infisical, and anything gated on that initialises too late to
 * be useful (see the same warning in apps/api/src/otel.ts).
 *
 * These are passed explicitly rather than installed onto `https.globalAgent`.
 * The global agent is also used by Sentry and the OTLP exporters, which hold
 * longer-lived requests that a 30s socket timeout would cut short.
 */
export const sharedHttpAgent = new http.Agent(agentOptions);
export const sharedHttpsAgent = new https.Agent(agentOptions);

/**
 * Spread into an `axios.create()` config to put a client on the shared pool.
 */
export const sharedHttpAgents = {
  httpAgent: sharedHttpAgent,
  httpsAgent: sharedHttpsAgent,
};
