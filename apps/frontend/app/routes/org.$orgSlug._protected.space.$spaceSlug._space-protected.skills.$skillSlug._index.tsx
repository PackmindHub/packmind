import { Navigate, type LoaderFunctionArgs } from 'react-router';
import { redirectSkillToContextComponent } from '../../src/shared/data/redirectToContext';

/**
 * The bare address of a skill. It has never shown anything itself, sending the
 * reader on to the skill's files, and in the plugin-first navigation it sends
 * them to the pane instead.
 *
 * Both this and `files/*` redirect, because both are addresses in the wild: the
 * hop below is client-side, so whichever of the two a link was copied from, it
 * is a real address of that skill.
 */
export async function clientLoader(args: LoaderFunctionArgs) {
  return redirectSkillToContextComponent(args);
}

export default function SkillDetailIndexRouteModule() {
  return <Navigate to="files" replace />;
}
