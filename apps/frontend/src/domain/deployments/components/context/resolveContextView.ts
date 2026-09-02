/**
 * What the Context surface shows.
 *
 * `package` is the ordinary case: the rail indexes the packages of the space
 * and the pane reads the open one. `inventory` swaps the pane for the space's
 * own components, whatever package carries them. `blank` replaces the whole
 * surface, rail included.
 */
export type ContextView = 'blank' | 'inventory' | 'package';

/**
 * Which of the three the surface renders, given what the space holds and what
 * the address asks for.
 *
 * A function of its own because the interesting rule is easy to get wrong in
 * place, and was: the surface used to answer `blank` for any space with no
 * package. A space with no package is not an empty space. Standards, commands
 * and skills outlive the packages that referenced them, they arrive from a
 * repository before anyone has sorted them, and either way they are the one
 * thing on this surface that needs doing. Answering `blank` there told the
 * reader their space was empty while holding the components they came to place,
 * and hid the only list that shows them.
 *
 * So the blank state is reserved for a space with nothing in it at all, and a
 * space with components and nowhere to put them opens on the inventory: it is
 * the only thing the pane can read, and it is the work.
 *
 * `requestsInventory` is ignored when there is no package, because there is
 * nothing else to show. That keeps the inventory addressable by the same
 * parameter in both cases rather than making "no package" a fourth state the
 * address has to know about.
 */
export function resolveContextView({
  packageCount,
  componentCount,
  requestsInventory,
}: Readonly<{
  packageCount: number;
  componentCount: number;
  requestsInventory: boolean;
}>): ContextView {
  if (packageCount === 0) {
    return componentCount === 0 ? 'blank' : 'inventory';
  }
  return requestsInventory ? 'inventory' : 'package';
}
