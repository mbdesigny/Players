/* Pure focus-cycle helpers — shared by the app.js overlay focus trap (F-31).
   DOM-free by design so it stays unit-testable under `node --test`. */

/**
 * Returns the element that should receive focus next when the user presses
 * Tab (dir = 1) or Shift+Tab (dir = -1) inside a focus-trapped container.
 *
 * @param {ArrayLike<HTMLElement>} list  focusable elements, in DOM order
 * @param {HTMLElement|null} current     currently focused element (null/unknown = none inside)
 * @param {number} dir                   1 = forward (Tab), -1 = backward (Shift+Tab)
 * @returns {HTMLElement|null} next element, or null when the list is empty
 */
export function nextFocusable(list, current, dir = 1) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const i = current ? list.indexOf(current) : -1;
  if (i === -1) return dir >= 0 ? list[0] : list[list.length - 1];
  const step = dir >= 0 ? 1 : -1;
  return list[(i + step + list.length) % list.length];
}
