/**
 * What the app says about a repository Packmind cannot write to, in one place.
 *
 * A repository is reachable from the app only while Packmind holds credentials
 * for its provider, either a token or a live app installation. Without them the
 * distribution surfaces still list it, still know it has drifted, and can do
 * nothing about it: the catch-up has to happen in a checkout, where the
 * developer's own credentials are.
 *
 * Five surfaces said so by naming the mechanism that failed, "this provider has
 * no token". True, and useless: it names an object the reader has never seen,
 * it is wrong by a word for the organisations that connect through the app
 * rather than a token, and it leaves them to work out why the CLI is being
 * asked for. Which was the feedback.
 *
 * Every sentence here is now the refusal and then the way round it, in that
 * order, because that is the order the reader needs them in. Nobody arrives at
 * this banner wanting to understand Packmind's credential model; they wanted to
 * distribute something and the button was grey.
 *
 * So the mechanism is gone from the copy, and so is the history. An earlier
 * pass explained that a repository arrives in this state because the CLI
 * reported it, which is the usual reason and is not something the reader can
 * act on. The link does that work instead: it names the thing that is missing
 * and goes to where it is added.
 */

/** The refusal, as the heading of the repository-level banner. */
export const NO_GIT_CONNECTION_TITLE =
  'Packmind cannot push to this repository';

/** What to do about it. */
export const NO_GIT_CONNECTION_BODY =
  'Run `packmind install` in a checkout to update its distributions.';

/** The other way out, and the label of the link that offers it. */
export const ADD_GIT_CONNECTION_LABEL = 'Add a Git connection';

/**
 * The whole story, one hover away from the two lines above.
 *
 * The banner is two lines because a reader who came to distribute something
 * wants the command, not the credential model. But some readers do want to know
 * why their repository is the one that cannot be pushed to, and answering that
 * in the banner is what made the first two attempts unreadable. So it moves
 * behind an affordance: nothing is lost, and nobody pays for it who did not ask.
 *
 * It can also say more than the banner ever could. The banner cannot claim this
 * repository came from the CLI, because a revoked connection leaves one looking
 * identical and the screen cannot tell them apart. With room for both, the
 * question the feedback actually asked gets a full answer.
 */
export const NO_GIT_CONNECTION_WHY =
  "Packmind holds no credentials for this repository's Git host, so it cannot " +
  'write there. Your checkout does. A repository is in this state because the ' +
  'CLI reported it, or because its Git connection was revoked.';

/** What the affordance is called, for a reader who cannot hover one. */
export const NO_GIT_CONNECTION_WHY_LABEL = 'Why Packmind cannot push here';

/**
 * Why a locked control will not act, for the rows and the repository-wide
 * button alike.
 *
 * It repeats the banner's refusal, because a tooltip is read where the pointer
 * is: whoever hovers a locked control has not necessarily read anything above
 * it, and on the package surfaces there is no banner to have read.
 *
 * One sentence for both scopes. They had one each, differing only in "this
 * distribution" against "its distributions", which is what the control the
 * tooltip hangs off already says.
 */
export const NO_GIT_CONNECTION_TOOLTIP =
  'Packmind cannot push here. Run `packmind install` in a checkout.';

/**
 * The same, for a control that acts on every drifted destination at once and is
 * stuck because they all share this reason.
 *
 * `any` rather than a count: the count is what the surface below is for, and a
 * tooltip that says how many would read as the answer to how many are left.
 */
export const NO_GIT_CONNECTION_ALL_TOOLTIP =
  'Packmind cannot push to any drifted destination. Run `packmind install` in ' +
  'a checkout.';
