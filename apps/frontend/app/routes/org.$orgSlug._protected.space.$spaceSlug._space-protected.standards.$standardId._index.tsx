import { Navigate, type LoaderFunctionArgs } from 'react-router';
import { redirectToContextComponent } from '../../src/shared/data/redirectToContext';

/**
 * The bare address of a standard, which is what every link to a standard in the
 * product was built from. In the plugin-first navigation it opens in the
 * Context pane instead of on a page the sidebar does not list.
 *
 * On this route and not on the layout above it, which is the whole reason the
 * standard's index exists as a file of its own now. The layout carries
 * `summary`, `deployment` and `rule/:ruleId`, and a redirect placed there would
 * take all three with it. A rule's own page is where its examples and its
 * linter program are set up, the pane deliberately does not carry that, and the
 * `Configure` link on each rule row is what points at it.
 */
export async function clientLoader(args: LoaderFunctionArgs) {
  return redirectToContextComponent(args, args.params.standardId as string);
}

export default function StandardDetailIndexRouteModule() {
  return <Navigate to="summary" replace />;
}
