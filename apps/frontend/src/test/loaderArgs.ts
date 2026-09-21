import { RouterContextProvider, type LoaderFunctionArgs } from 'react-router';

// `LoaderFunctionArgs` carries five members, and a route loader only ever reads
// two of them: `params` and `request`. Spelling the object out at each call site
// meant every spec had to grow `url`, `pattern` and a real `context` the day
// react-router added them — which is exactly what happened. This factory owns
// the three a loader never looks at, so a spec states only what it is about.

export type LoaderArgsOptions = {
  /** The address being navigated to. `request` and `url` are both derived from it. */
  url?: string;
  params?: Record<string, string>;
  /** Un-interpolated route pattern; loaders use it for tracing, never for control flow. */
  pattern?: string;
};

export const makeLoaderArgs = ({
  url = 'https://app.packmind.com/',
  params = {},
  pattern = '',
}: LoaderArgsOptions = {}): LoaderFunctionArgs<
  Readonly<RouterContextProvider>
> => ({
  request: new Request(url),
  url: new URL(url),
  pattern,
  params,
  context: new RouterContextProvider(),
});
