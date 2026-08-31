import { Agent, setGlobalDispatcher } from 'undici';
import {
  HTTP_KEEP_ALIVE_TIMEOUT_MS,
  HTTP_MAX_SOCKETS,
} from './sharedHttpAgents';

/**
 * The ceiling undici will honour when a server advertises a longer keep-alive
 * than we asked for. Ten minutes is well beyond anything we would hold a socket
 * for on purpose; it exists so a misbehaving peer cannot pin connections open
 * indefinitely.
 */
export const HTTP_KEEP_ALIVE_MAX_TIMEOUT_MS = 600_000;

/**
 * Put Node's built-in `fetch` on a pool with the same keep-alive window as the
 * axios clients.
 *
 * `sharedHttpAgents` cannot cover this ground. Several dependencies never touch
 * axios and reach the network through global `fetch` instead — the Infisical
 * SDK (whose only deps are AWS crypto and smithy packages), and the OpenAI,
 * Anthropic and Gemini SDKs. Passing an `httpsAgent` to `axios.create()` is
 * invisible to all of them. undici defaults `keepAliveTimeout` to 4 seconds,
 * so they have the same too-short-window problem the http agents just fixed.
 *
 * This is an explicit call rather than an import side effect, so that importing
 * anything from this package does not silently reconfigure the process's
 * networking. Call it once, early in an application's bootstrap.
 *
 * Note this only reaches `fetch`. Sentry and the OTLP exporters use the http
 * module and are deliberately left on Node's global agent.
 */
export function installGlobalHttpPool(): Agent {
  const dispatcher = new Agent({
    keepAliveTimeout: HTTP_KEEP_ALIVE_TIMEOUT_MS,
    keepAliveMaxTimeout: HTTP_KEEP_ALIVE_MAX_TIMEOUT_MS,
    connections: HTTP_MAX_SOCKETS,
  });

  setGlobalDispatcher(dispatcher);

  return dispatcher;
}
